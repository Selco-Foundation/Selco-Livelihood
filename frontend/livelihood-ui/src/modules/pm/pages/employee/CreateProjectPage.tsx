import { employeeHomePath, extractApiErrorMessage, translateOr, useAuthStore, useTranslate } from "@/shared";
import { Button, TopBar } from "@/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmSubmitDialog } from "../../components/ConfirmSubmitDialog";
import { WizardStepper } from "../../components/WizardStepper";
import { WizardSuccessCard } from "../../components/WizardSuccessCard";
import { EndUserDataStep, type EndUserDataStepHandle } from "../../components/steps/EndUserDataStep";
import { GeographyDetailsStep, isGeographyDetailsValid } from "../../components/steps/GeographyDetailsStep";
import {
  isProjectDetailsValid,
  ProjectDetailsStep,
  type ProjectDetailsValue,
} from "../../components/steps/ProjectDetailsStep";
import { WizardActionFooter } from "../../components/WizardActionFooter";
import { useSaveProject } from "../../hooks/use-create-project";
import { pmKeys } from "../../hooks/query-keys";
import { useProjectById } from "../../hooks/use-project-by-id";
import type { CreateProjectRouteSearch } from "../../routes";
import { scheduleProject } from "../../services/project";
import type { GeographyDetails, Project } from "../../types/project";
import { pmMyProjectsPath, pmProjectDetailsPath } from "../../utils/paths";
import { tenantId } from "@/shared/config/global-config";

export function CreateProjectPage() {
  const { t } = useTranslate();

  // Built inside the component because the labels need `t` — the same reason
  // CreateInstallationPlanPage builds its own list here rather than at module scope.
  const STEP_DEFINITIONS = [
    { label: translateOr(t, "ES_PM_PROJECT_DETAILS_STEP", "Project Details") },
    { label: translateOr(t, "ES_PM_GEOGRAPHY_DETAILS_STEP", "Geography Details") },
    { label: translateOr(t, "ES_PM_END_USER_DATA_STEP", "End User Data") },
  ];
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
    // Scheduling flips the project's status, so the detail read has to refresh too, not
    // just the list — pmKeys.projects() covers both.
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: pmKeys.projects() }),
  });

  const [projectDetails, setProjectDetails] = useState<ProjectDetailsValue>({
    justificationCode: "",
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
  const [navError, setNavError] = useState<string | undefined>(undefined);
  const [completedProject, setCompletedProject] = useState<Project | null>(null);
  const endUserDataStepRef = useRef<EndUserDataStepHandle>(null);
  const handleEndUserSubmitAvailabilityChange = useCallback((isAvailable: boolean) => {
    setEndUserDataCanSubmit(isAvailable);
  }, []);

  useEffect(() => {
    if (!existingProject) return;
    setProjectDetails({
      justificationCode: existingProject.additionalDetails?.justificationCode ?? "",
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
      tenantId: existingProject?.tenantId ?? tenantId(),
      name: existingProject?.name,
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

  async function handleNext() {
    setNavError(undefined);

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
      //
      // This must stay awaited inside try/catch: creating a project is a real network write that
      // can fail (and `createProject` additionally throws when the row never lands). Left as a
      // fire-and-forget `.then()`, a failure did nothing at all — the PM pressed Next, stayed on
      // step 2, and saw no indication anything had gone wrong.
      try {
        const saved = await persistGeography();
        setSavedGeographyDetails(saved.additionalDetails?.geographyDetails ?? geographyDetails);
        void navigate({ search: () => ({ projectId: saved.id, step: 3 }), replace: true });
      } catch (error) {
        setNavError(
          extractApiErrorMessage(error) ??
            translateOr(t, "ES_PM_PROJECT_SAVE_FAILED", "Couldn't save the project. Please try again."),
        );
      }
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
      <WizardSuccessCard
        title={translateOr(t, "ES_PM_PROJECT_CREATED", "Project Created!")}
        itemLabel={translateOr(t, "ES_PM_PROJECT_NAME", "Project Name")}
        itemName={completedProject.name}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void rawNavigate({ to: employeeHomePath() })}>
              {translateOr(t, "CORE_COMMON_OVERVIEW", "Overview")}
            </Button>
            <Button
              size="sm"
              onClick={() => void rawNavigate({ to: pmProjectDetailsPath(), search: { projectId: completedProject.id } })}
            >
              {translateOr(t, "ES_PM_GO_TO_PROJECT", "Go To Project")}
            </Button>
          </>
        }
      />
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

      <WizardStepper
        steps={STEP_DEFINITIONS}
        currentStep={currentStep}
        onStepChange={goToStep}
        isStepClickable={(step) =>
          (step < currentStep || isEditingExisting) && !(step === 3 && isGeographyDirty)
        }
      />

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

      {navError ? <p className="text-sm text-destructive">{navError}</p> : null}

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
          <Button type="button" size="sm" className="px-5" onClick={() => void handleNext()} disabled={!canGoNext || isNavigationBusy}>
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

      <ConfirmSubmitDialog
        open={confirmOpen}
        descriptionKey="ES_PM_CONFIRM_SUBMIT_PROJECT_DESCRIPTION"
        descriptionFallback="Once this project is submitted, its end-user data will be finalized and the project will become active."
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
