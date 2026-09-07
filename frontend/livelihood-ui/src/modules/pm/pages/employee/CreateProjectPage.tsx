import { useEffect, useState } from "react";
import { tenantId } from "@/shared";
import { Button, Skeleton, Stepper } from "@/ui";
import { LanguageSwitcher } from "@/modules/core";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useProjectById } from "../../hooks/use-project-by-id";
import { useSaveProject } from "../../hooks/use-create-project";
import {
  isProjectDetailsValid,
  ProjectDetailsStep,
  type ProjectDetailsValue,
} from "../../components/steps/ProjectDetailsStep";
import {
  GeographyDetailsStep,
  isGeographyDetailsValid,
} from "../../components/steps/GeographyDetailsStep";
import { EndUserDataStep } from "../../components/steps/EndUserDataStep";
import type { CreateProjectRouteSearch } from "../../routes";
import type { GeographyDetails, Project } from "../../types/project";

const STEPS = [{ label: "Project Details" }, { label: "Geography Details" }, { label: "End User Data" }];

const EMPTY_STEP1: ProjectDetailsValue = { justificationCode: "" };
const EMPTY_STEP2: GeographyDetails = { states: [], districts: [], blocks: [] };

export function CreateProjectPage() {
  const search = useSearch({ strict: false }) as CreateProjectRouteSearch;
  const navigate = useNavigate() as (opts: {
    search: (prev: CreateProjectRouteSearch) => CreateProjectRouteSearch;
    replace?: boolean;
  }) => Promise<void>;

  const [step1, setStep1] = useState<ProjectDetailsValue>(EMPTY_STEP1);
  const [step2, setStep2] = useState<GeographyDetails>(EMPTY_STEP2);
  const [currentStep, setCurrentStep] = useState(search.step ?? (search.projectId ? 3 : 1));
  const [submitError, setSubmitError] = useState<string | null>(null);

  const projectId = search.projectId;
  const { data: existingProject, isLoading: isLoadingProject } = useProjectById(projectId);
  const saveProject = useSaveProject();

  // Resume: prefill from the saved project once it loads.
  useEffect(() => {
    if (!existingProject) return;
    const project = existingProject.project;
    setStep1({
      justificationCode: project.additionalDetails?.justificationCode ?? "",
      startDate: project.startDate ? new Date(project.startDate) : undefined,
      endDate: project.endDate ? new Date(project.endDate) : undefined,
    });
    setStep2(
      project.additionalDetails?.geographyDetails ?? EMPTY_STEP2,
    );
  }, [existingProject]);

  function goToStep(step: number) {
    setCurrentStep(step);
    void navigate({ search: (prev) => ({ ...prev, step }), replace: true });
  }

  async function handleGeographyNext() {
    setSubmitError(null);
    const project: Project = {
      id: projectId,
      tenantId: tenantId(),
      projectType: "Agriculture",
      startDate: step1.startDate?.getTime(),
      endDate: step1.endDate?.getTime(),
      additionalDetails: {
        justificationCode: step1.justificationCode,
        geographyDetails: step2,
      },
      // `address` holds a single boundary reference; with multiple states
      // selected there's no one value to put there, so it's simply omitted —
      // it's optional on this backend and geographyDetails.states is always
      // the source of truth for scope.
      address:
        step2.states?.length === 1
          ? { boundaryType: "State", boundary: step2.states[0].code, tenantId: tenantId() }
          : undefined,
    };

    try {
      const saved = await saveProject.mutateAsync(project);
      void navigate({
        search: (prev) => ({ ...prev, projectId: saved.id, step: 3 }),
        replace: true,
      });
      setCurrentStep(3);
    } catch (error) {
      const axiosError = error as { response?: { data?: { Errors?: Array<{ message?: string }> } } };
      setSubmitError(
        axiosError.response?.data?.Errors?.[0]?.message ?? "Could not save the project. Please try again.",
      );
    }
  }

  if (projectId && isLoadingProject) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div className="flex justify-end">
        <LanguageSwitcher />
      </div>
      <Stepper
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={(step) => goToStep(step)}
      />

      <div className="livelihood-card p-6">
        {currentStep === 1 ? (
          <ProjectDetailsStep value={step1} onChange={setStep1} />
        ) : null}
        {currentStep === 2 ? (
          <GeographyDetailsStep value={step2} onChange={setStep2} />
        ) : null}
        {currentStep === 3 && projectId ? (
          <EndUserDataStep projectId={projectId} geography={step2} />
        ) : null}

        {submitError ? <p className="mt-4 text-sm text-destructive">{submitError}</p> : null}

        {currentStep < 3 ? (
          <div className="mt-6 flex justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={currentStep === 1}
              onClick={() => goToStep(currentStep - 1)}
            >
              Back
            </Button>
            {currentStep === 1 ? (
              <Button
                size="sm"
                disabled={!isProjectDetailsValid(step1)}
                onClick={() => goToStep(2)}
              >
                Next
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={!isGeographyDetailsValid(step2) || saveProject.isPending}
                onClick={handleGeographyNext}
              >
                {saveProject.isPending ? "Saving..." : "Next"}
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
