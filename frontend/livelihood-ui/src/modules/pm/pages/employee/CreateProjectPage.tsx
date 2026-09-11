import { employeeHomePath, translateOr, useTranslate } from "@/shared";
import { Button, Stepper, TopBar } from "@/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { pmMyProjectsPath } from "../../utils/paths";

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
  const scheduleMutation = useMutation({
    mutationFn: () => scheduleProject(projectId!),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["pm-projects"] }),
  });

  const [projectDetails, setProjectDetails] = useState<ProjectDetailsValue>({ justificationCode: "" });
  const [geographyDetails, setGeographyDetails] = useState<GeographyDetails>({});
  const [endUserDataReady, setEndUserDataReady] = useState(false);
  const [endUserDataBusy, setEndUserDataBusy] = useState(false);
  const [endUserDataCanSubmit, setEndUserDataCanSubmit] = useState(false);
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
    setGeographyDetails(existingProject.additionalDetails?.geographyDetails ?? {});
    if (existingProject.additionalDetails?.status === "ACTIVE") {
      setEndUserDataReady(true);
    }
  }, [existingProject]);

  // Step 3 has no meaning before the project exists — bounce back to
  // geography details if it's reached any other way (e.g. a stale/typed URL).
  useEffect(() => {
    if (currentStep === 3 && !projectId) {
      void navigate({ search: (prev) => ({ ...prev, step: 2 }), replace: true });
    }
  }, [currentStep, projectId]);

  async function persistGeography(): Promise<Project> {
    const project: Project = {
      id: projectId,
      tenantId: existingProject?.tenantId ?? "pg",
      name: existingProject?.name,
      projectType: "PROJECT",
      startDate: projectDetails.startDate,
      endDate: projectDetails.endDate,
      additionalDetails: {
        ...existingProject?.additionalDetails,
        justificationCode: projectDetails.justificationCode,
        geographyDetails,
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
      // A project is deliberately created only from this explicit forward
      // action. Going Back or changing the geography keeps all draft values
      // in component state and must not write a project record.
      void persistGeography().then((saved) => {
        void navigate({ search: () => ({ projectId: saved.id, step: 3 }), replace: true });
      });
    }
  }

  async function handleComplete() {
    await scheduleMutation.mutateAsync();
    void rawNavigate({ to: pmMyProjectsPath() });
  }

  const canGoNext =
    currentStep === 1 ? isProjectDetailsValid(projectDetails) : isGeographyDetailsValid(geographyDetails);

  // A save-in-flight (leaving step 2) or an active upload/validate/create
  // call (step 3) should block further navigation until it settles, so two
  // saves can never race and a page you've navigated away from can't finish
  // silently underneath you.
  const isNavigationBusy = saveProject.isPending || scheduleMutation.isPending || endUserDataBusy;

  // The progress bar tracks the project's actual lifecycle, not just which
  // step is being looked at right now: nothing yet (brand new, step 1/2
  // before creation) -> empty; created but end-user data not uploaded
  // -> half; end-user data uploaded (validated, whether or not the final
  // "Submit" has been clicked yet) -> full, and it stays full from then on.
  const progressPercent = endUserDataReady ? 100 : isEditingExisting ? 50 : 0;

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
          steps={STEP_DEFINITIONS}
          currentStep={currentStep}
          onStepClick={goToStep}
          allowAllSteps={isEditingExisting}
          progressPercent={progressPercent}
        />
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
          onComplete={handleComplete}
          onValidated={() => setEndUserDataReady(true)}
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
    </div>
  );
}
