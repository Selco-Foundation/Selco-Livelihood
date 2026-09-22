import { employeeHomePath, extractApiErrorMessage, translateOr, useAuthStore, useTranslate } from "@/shared";
import { Button, TopBar } from "@/ui";
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@/components/reui/stepper";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Check, CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmSubmitProjectDialog } from "../../components/ConfirmSubmitProjectDialog";
import { EndUserDataStep, type EndUserDataStepHandle } from "../../components/steps/EndUserDataStep";
import { GeographyDetailsStep, isGeographyDetailsValid } from "../../components/steps/GeographyDetailsStep";
import {
  isProjectDetailsValid,
  ProjectDetailsStep,
  type ProjectDetailsValue,
} from "../../components/steps/ProjectDetailsStep";
import { WizardActionFooter } from "../../components/WizardActionFooter";
import { useSaveProject } from "../../hooks/use-create-project";
import { useProjectById } from "../../hooks/use-project-by-id";
import type { CreateProjectRouteSearch } from "../../routes";
import { scheduleProject } from "../../services/project";
import type { GeographyDetails, Project } from "../../types/project";
import { pmMyProjectsPath, pmProjectDetailsPath } from "../../utils/paths";

const STEP_DEFINITIONS = [
  { label: "Project Details" },
  { label: "Geography Details" },
  { label: "End User Data" },
];

export function CreateProjectPage() {
  const { t } = useTranslate();
  // The create-project route's path is computed at runtime via contextPath(),
  // so there's no static `Route` export to use the fully-typed search API
  // here — read/write the current route's search loosely instead (same
  // pattern as im's InboxPage).
  const search = useSearch({ strict: false }) as CreateProjectRouteSearch;
  const rawNavigate = useNavigate();
  const navigate = rawNavigate as (opts: {
    search: (prev: CreateProjectRouteSearch) => CreateProjectRouteSearch;
    replace?: boolean;
  }) => Promise<void>;

  const projectId = search.projectId;
  const currentStep = search.step ?? 1;
  // Once the project already exists (even as a draft), its justification
  // code and dates are locked, the stepper can jump to any step directly,
  // and geography edits may prune already-uploaded end-user sites. Step 3
  // (end-user data) has nothing to attach to until the project exists, so
  // it's the one step that's unreachable before then (guarded below).
  const isEditingExisting = Boolean(projectId);

  const { data: existingProject } = useProjectById(projectId);
  const saveProject = useSaveProject();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const authUser = useAuthStore((state) => state.user);
  const scheduleMutation = useMutation({
    mutationFn: () => scheduleProject(projectId!, accessToken ?? undefined, authUser),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["pm-projects"] }),
  });

  const [projectDetails, setProjectDetails] = useState<ProjectDetailsValue>({
    justificationCode: "",
    projectType: "",
  });
  const [geographyDetails, setGeographyDetails] = useState<GeographyDetails>({});
  // Snapshot of whatever geography is actually persisted on the backend — diverges from
  // `geographyDetails` the moment the PM edits it on step 2, and is only realigned once
  // `persistGeography()` actually succeeds. Used to block jumping to step 3 via the stepper nav
  // with unsaved geography changes; the "Next" button is the only way to persist them.
  const [savedGeographyDetails, setSavedGeographyDetails] = useState<GeographyDetails>({});
  const [endUserDataBusy, setEndUserDataBusy] = useState(false);
  const [endUserDataCanSubmit, setEndUserDataCanSubmit] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmError, setConfirmError] = useState<string | undefined>(undefined);
  const [completedProject, setCompletedProject] = useState<Project | null>(null);
  const endUserDataStepRef = useRef<EndUserDataStepHandle>(null);
  const handleEndUserSubmitAvailabilityChange = useCallback((isAvailable: boolean) => {
    setEndUserDataCanSubmit(isAvailable);
  }, []);

  useEffect(() => {
    if (!existingProject) return;
    setProjectDetails({
      justificationCode: existingProject.additionalDetails?.justificationCode ?? "",
      projectType: existingProject.projectType ?? "",
      startDate: existingProject.startDate,
      endDate: existingProject.endDate,
    });
    const savedGeography = existingProject.additionalDetails?.geographyDetails ?? {};
    setGeographyDetails(savedGeography);
    setSavedGeographyDetails(savedGeography);
  }, [existingProject]);

  // Step 3 has no meaning before the project exists — bounce back to
  // geography details if it's reached any other way (e.g. a stale/typed URL).
  useEffect(() => {
    if (currentStep === 3 && !projectId) {
      void navigate({ search: (prev) => ({ ...prev, step: 2 }), replace: true });
    }
  }, [currentStep, projectId]);

  async function persistGeography(): Promise<Project> {
    // The full field set below (projectSubType/department/description/referenceID/parent) is
    // required at the DB layer but unvalidated by the API — omitting any of them makes the row
    // 200 while never actually landing (a proven silent-failure trap). `createProject`/
    // `updateProject` confirm the write via a follow-up search rather than trusting this response.
    const project: Project = {
      id: projectId,
      tenantId: existingProject?.tenantId ?? "livelihood",
      name: existingProject?.name,
      projectType: projectDetails.projectType,
      projectSubType: "PROJECT",
      department: "",
      description: "",
      referenceID: existingProject?.referenceID ?? "1",
      parent: "",
      startDate: projectDetails.startDate,
      endDate: projectDetails.endDate,
      additionalDetails: {
        ...existingProject?.additionalDetails,
        justificationCode: projectDetails.justificationCode,
        geographyDetails,
        status: existingProject?.additionalDetails?.status ?? "DRAFT",
      },
    };
    return saveProject.mutateAsync(project);
  }

  function goToStep(step: number) {
    // Later steps stay unreachable until the project exists.
    if (step === 3 && !projectId && !isGeographyDetailsValid(geographyDetails)) return;

    void navigate({ search: (prev) => ({ ...prev, step }), replace: true });
  }

  function handleNext() {
    if (currentStep === 1) {
      goToStep(2);
      return;
    }
    if (currentStep === 2) {
      // Revisiting an existing draft whose geography hasn't actually changed has nothing new to
      // persist — skip the `_update` call entirely and just advance.
      if (isEditingExisting && !isGeographyDirty) {
        void navigate({ search: () => ({ projectId, step: 3 }), replace: true });
        return;
      }
      // A project is deliberately created only from this explicit forward
      // action. Going Back or changing the geography keeps all draft values
      // in component state and must not write a project record.
      void persistGeography().then((saved) => {
        setSavedGeographyDetails(saved.additionalDetails?.geographyDetails ?? geographyDetails);
        void navigate({ search: () => ({ projectId: saved.id, step: 3 }), replace: true });
      });
    }
  }

  const isGeographyDirty = JSON.stringify(geographyDetails) !== JSON.stringify(savedGeographyDetails);

  async function handleConfirmSubmit() {
    setConfirmError(undefined);
    try {
      const scheduledProject = await scheduleMutation.mutateAsync();
      setConfirmOpen(false);
      setCompletedProject(scheduledProject);
    } catch (error) {
      setConfirmError(extractApiErrorMessage(error) ?? "Failed to submit the project. Please try again.");
    }
  }

  const canGoNext =
    currentStep === 1 ? isProjectDetailsValid(projectDetails) : isGeographyDetailsValid(geographyDetails);

  // A save-in-flight (leaving step 2) or an active upload/validate/create
  // call (step 3) should block further navigation until it settles, so two
  // saves can never race and a page you've navigated away from can't finish
  // silently underneath you.
  const isNavigationBusy = saveProject.isPending || scheduleMutation.isPending || endUserDataBusy;

  if (completedProject) {
    return (
      <div className="w-full space-y-6">
        <div className="livelihood-card overflow-hidden">
          <div className="flex flex-col items-center gap-4 bg-primary px-6 py-12 text-center text-primary-foreground">
            <h1 className="text-2xl font-bold">{translateOr(t, "ES_PM_PROJECT_CREATED", "Project Created!")}</h1>
            <CheckCircle2 className="size-12" />
            <div>
              <p className="text-sm font-medium">{translateOr(t, "ES_PM_PROJECT_NAME", "Project Name")}</p>
              <p className="text-lg font-semibold">{completedProject.name}</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 p-4">
            <Button variant="outline" size="sm" onClick={() => void rawNavigate({ to: employeeHomePath() })}>
              {translateOr(t, "CORE_COMMON_OVERVIEW", "Overview")}
            </Button>
            <Button
              size="sm"
              onClick={() => void rawNavigate({ to: pmProjectDetailsPath(), search: { projectId: completedProject.id } })}
            >
              {translateOr(t, "ES_PM_GO_TO_PROJECT", "Go To Project")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-20">
      <TopBar
        title={translateOr(t, "ES_PM_CREATE_PROJECT", "Create Project")}
        breadcrumbs={[
          { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
          { label: translateOr(t, "ES_PM_MY_PROJECTS", "My Projects"), to: pmMyProjectsPath() },
          { label: translateOr(t, "ES_PM_CREATE_PROJECT", "Create Project") },
        ]}
      />

      <div className="livelihood-card w-full p-6">
        <Stepper
          value={currentStep}
          onValueChange={(step) => goToStep(step)}
          indicators={{ completed: <Check className="size-3.5" /> }}
        >
          <StepperNav>
            {STEP_DEFINITIONS.map((step, index) => {
              const stepNumber = index + 1;
              const isClickable =
                stepNumber !== currentStep &&
                (stepNumber < currentStep || isEditingExisting) &&
                !(stepNumber === 3 && isGeographyDirty);

              return (
                <StepperItem
                  key={step.label}
                  step={stepNumber}
                  disabled={!isClickable}
                  className="relative flex-1 items-start"
                >
                  <StepperTrigger className="flex flex-col items-center gap-2">
                    <StepperIndicator>{stepNumber}</StepperIndicator>
                    <StepperTitle>{step.label}</StepperTitle>
                  </StepperTrigger>

                  {STEP_DEFINITIONS.length > stepNumber ? (
                    <StepperSeparator className="group-data-[state=completed]/step:bg-primary absolute inset-x-0 top-3 left-[calc(50%+0.875rem)] m-0 group-data-[orientation=horizontal]/stepper-nav:w-[calc(100%-2rem+0.225rem)] group-data-[orientation=horizontal]/stepper-nav:flex-none" />
                  ) : null}
                </StepperItem>
              );
            })}
          </StepperNav>
        </Stepper>
      </div>

      {currentStep === 1 ? (
        <ProjectDetailsStep value={projectDetails} onChange={setProjectDetails} locked={isEditingExisting} />
      ) : null}
      {currentStep === 2 ? (
        <GeographyDetailsStep
          value={geographyDetails}
          onChange={setGeographyDetails}
          hasEndUserData={isEditingExisting}
        />
      ) : null}
      {currentStep === 3 ? (
        <EndUserDataStep
          ref={endUserDataStepRef}
          projectId={projectId}
          geographyDetails={geographyDetails}
          onComplete={async () => {
            setConfirmOpen(true);
          }}
          onBusyChange={setEndUserDataBusy}
          onSubmitAvailabilityChange={handleEndUserSubmitAvailabilityChange}
        />
      ) : null}

      <WizardActionFooter>
        {currentStep > 1 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => goToStep(currentStep - 1)}
            disabled={isNavigationBusy}
          >
            {translateOr(t, "CORE_COMMON_BACK", "Back")}
          </Button>
        ) : null}
        {currentStep < 3 ? (
          <Button type="button" size="sm" className="px-5" onClick={handleNext} disabled={!canGoNext || isNavigationBusy}>
            {translateOr(t, "CORE_COMMON_NEXT", "Next")}
          </Button>
        ) : null}
        {currentStep === 3 ? (
          <Button
            type="button"
            size="sm"
            className="px-5"
            onClick={() => void endUserDataStepRef.current?.submit()}
            disabled={isNavigationBusy || !endUserDataCanSubmit}
          >
            {translateOr(t, "ES_PM_SUBMIT", "Submit")}
          </Button>
        ) : null}
      </WizardActionFooter>

      <ConfirmSubmitProjectDialog
        open={confirmOpen}
        isSubmitting={scheduleMutation.isPending}
        errorMessage={confirmError}
        onCancel={() => {
          setConfirmError(undefined);
          setConfirmOpen(false);
        }}
        onConfirm={() => void handleConfirmSubmit()}
      />
    </div>
  );
}
