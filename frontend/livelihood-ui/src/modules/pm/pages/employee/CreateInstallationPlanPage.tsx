import { employeeHomePath, translateOr, useTranslate } from "@/shared";
import { Button, Stepper, TopBar } from "@/ui";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ConfirmSubmitPlanDialog } from "../../components/ConfirmSubmitPlanDialog";
import {
  isAssignmentValid,
  TechnicianAssignmentStep,
  type AssignmentValue,
} from "../../components/steps/TechnicianAssignmentStep";
import { InstallationScopeStep, isScopeValid, type ScopeValue } from "../../components/steps/InstallationScopeStep";
import { isPlanDetailsValid, PlanDetailsStep, type PlanDetailsValue } from "../../components/steps/PlanDetailsStep";
import {
  isTemplateStepValid,
  TemplateStep,
  type TemplateValue,
  withStaticTemplateScope,
} from "../../components/steps/TemplateStep";
import { WizardActionFooter } from "../../components/WizardActionFooter";
import { useInstallationPlanById } from "../../hooks/use-installation-plan-by-id";
import { useProjectById } from "../../hooks/use-project-by-id";
import { useSaveInstallationPlan } from "../../hooks/use-save-installation-plan";
import type { InstallationPlanRouteSearch } from "../../routes";
import { publishInstallationPlan } from "../../services/installation-plan";
import type { InstallationPlan } from "../../types/installation-plan";
import { pmMyProjectsPath, pmProjectDetailsPath } from "../../utils/paths";

const STEP_DEFINITIONS = [
  { label: "Plan Details" },
  { label: "Installation Scope" },
  { label: "Template" },
  { label: "Technician Assignment" },
];

export function CreateInstallationPlanPage() {
  const { t } = useTranslate();
  // The route's path is computed at runtime via contextPath(), so there's no
  // static `Route` export to use the fully-typed search API here — read/
  // write the current route's search loosely instead (same pattern as
  // CreateProjectPage/im's InboxPage).
  const search = useSearch({ strict: false }) as InstallationPlanRouteSearch;
  const rawNavigate = useNavigate();
  const navigate = rawNavigate as (opts: {
    search: (prev: InstallationPlanRouteSearch) => InstallationPlanRouteSearch;
    replace?: boolean;
  }) => Promise<void>;

  const projectId = search.projectId;
  const planId = search.planId;
  const currentStep = search.step ?? 1;
  const { data: project } = useProjectById(projectId);
  const { data: existingPlan } = useInstallationPlanById(planId);
  const savePlan = useSaveInstallationPlan();

  const [planDetails, setPlanDetails] = useState<PlanDetailsValue>({
    geographyDetails: {},
    sectorCode: "",
    reviewerCode: "",
  });
  const [scope, setScope] = useState<ScopeValue>([]);
  const [templates, setTemplates] = useState<TemplateValue>([]);
  const [assignments, setAssignments] = useState<AssignmentValue>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [justPublished, setJustPublished] = useState(false);
  const [scopeBusy, setScopeBusy] = useState(false);
  const [scopeApplied, setScopeApplied] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [isPlanHydrated, setIsPlanHydrated] = useState(!planId);

  useEffect(() => {
    if (!planId) {
      setIsPlanHydrated(true);
      return;
    }
    if (!existingPlan) return;
    setPlanDetails({
      geographyDetails: existingPlan.geographyDetails ?? {},
      sectorCode: existingPlan.additionalDetails?.sectorCode ?? "",
      reviewerCode: existingPlan.additionalDetails?.reviewerCode ?? "",
      startDate: existingPlan.startDate,
      endDate: existingPlan.endDate,
    });
    setScope(existingPlan.additionalDetails?.scope ?? []);
    setTemplates(existingPlan.additionalDetails?.templates ?? []);
    setAssignments(existingPlan.additionalDetails?.assignments ?? []);
    setIsPlanHydrated(true);
  }, [existingPlan, planId]);

  const isPublished = existingPlan?.additionalDetails?.status === "PUBLISHED";

  // Scope linking is intentionally static for now. Retain linked rows and
  // supplement them with the fixed two-solution scope for the visual flow.
  const workflowScope = withStaticTemplateScope(scope);

  const uniqueSolutionCodes = useMemo(
    () =>
      Array.from(
        new Set(
          workflowScope.filter((entry) => entry.included && entry.solutionCode).map((entry) => entry.solutionCode!),
        ),
      ),
    [workflowScope],
  );

  async function persistPlan(): Promise<InstallationPlan> {
    const plan: InstallationPlan = {
      id: planId,
      tenantId: project?.tenantId ?? "pg",
      projectId: projectId!,
      name: existingPlan?.name,
      geographyDetails: planDetails.geographyDetails,
      startDate: planDetails.startDate,
      endDate: planDetails.endDate,
      additionalDetails: {
        ...existingPlan?.additionalDetails,
        sectorCode: planDetails.sectorCode,
        reviewerCode: planDetails.reviewerCode,
        scope: workflowScope,
        templates,
        assignments,
      },
    };
    return savePlan.mutateAsync(plan);
  }

  const isPlanDetailsComplete = isPlanDetailsValid(planDetails, project?.startDate, project?.endDate);
  const isScopeComplete = scopeApplied || isScopeValid(scope);
  const isTemplateComplete = isTemplateStepValid(templates, uniqueSolutionCodes);
  const isAssignmentComplete = isAssignmentValid(assignments, workflowScope);
  // The rail represents completed stages. A completed stage unlocks only
  // the next one, so the numbered navigation cannot skip unfinished work.
  const maxAccessibleStep = !planId ? 1 : !isScopeComplete ? 2 : !isTemplateComplete ? 3 : 4;
  const canGoNext =
    currentStep === 1
      ? isPlanDetailsComplete
      : currentStep === 2
        ? isScopeComplete
        : currentStep === 3
          ? isTemplateComplete
          : false;

  const stepsCompleted = [isScopeComplete, isTemplateComplete, isAssignmentComplete].filter(Boolean).length;
  const progressPercent = !planId ? 0 : isPublished ? 100 : 25 + stepsCompleted * 25;
  // Scope application reports its completed entries before React has flushed
  // the child hook's final `done` state. Once those valid entries are in the
  // plan state, the footer can safely enable Next instead of waiting on that
  // stale busy flag for one more render.
  const isNavigationBusy = savePlan.isPending || (scopeBusy && !isScopeComplete) || templateBusy;

  useEffect(() => {
    if (!isPlanHydrated || currentStep <= maxAccessibleStep) return;
    void navigate({ search: (prev) => ({ ...prev, step: maxAccessibleStep }), replace: true });
  }, [currentStep, isPlanHydrated, maxAccessibleStep, navigate]);

  function goToStep(step: number) {
    if (isNavigationBusy || step < 1 || step > maxAccessibleStep) return;
    void navigate({ search: (prev) => ({ ...prev, step }), replace: true });
  }

  async function handleNext() {
    if (!canGoNext || isNavigationBusy) return;
    // Moving forward is the only point at which a step is persisted. This
    // leaves Back and stepper navigation safely read-only.
    const saved = await persistPlan();
    void navigate({ search: () => ({ projectId, planId: saved.id, step: currentStep + 1 }), replace: true });
  }

  async function handleConfirmSubmit() {
    const saved = await persistPlan();
    await publishInstallationPlan(saved.id!);
    setConfirmOpen(false);
    setJustPublished(true);
  }

  if (justPublished) {
    return (
      <div className="w-full space-y-6">
        <div className="livelihood-card overflow-hidden">
          <div className="flex flex-col items-center gap-4 bg-primary px-6 py-12 text-center text-primary-foreground">
            <h1 className="text-2xl font-bold">
              {translateOr(t, "ES_PM_INSTALLATION_PLAN_CREATED", "Installation Plan Created!")}
            </h1>
            <CheckCircle2 className="size-12" />
            <div>
              <p className="text-sm font-medium">
                {translateOr(t, "ES_PM_INSTALLATION_PLAN_NAME", "Installation Plan Name")}
              </p>
              <p className="text-lg font-semibold">{existingPlan?.name}</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 p-4">
            <Button variant="outline" size="sm" onClick={() => void rawNavigate({ to: employeeHomePath() })}>
              {translateOr(t, "CORE_COMMON_OVERVIEW", "Overview")}
            </Button>
            <Button size="sm" onClick={() => void rawNavigate({ to: pmProjectDetailsPath(), search: { projectId } })}>
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
        title={translateOr(t, "ES_PM_CREATE_INSTALLATION_PLAN", "Create Installation Plan")}
        breadcrumbs={[
          { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
          { label: translateOr(t, "ES_PM_MY_PROJECTS", "My Projects"), to: pmMyProjectsPath() },
          {
            label: project?.name ?? translateOr(t, "ES_PM_PROJECT", "Project"),
            to: pmProjectDetailsPath(),
            search: { projectId },
          },
          { label: translateOr(t, "ES_PM_INSTALLATION_PLAN", "Installation Plan") },
        ]}
      />

      {isPublished ? (
        <div className="livelihood-card border border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
          {translateOr(
            t,
            "ES_PM_PLAN_PUBLISHED_READONLY",
            "This installation plan has been published and can no longer be edited.",
          )}
        </div>
      ) : null}

      <div className="livelihood-card w-full p-6">
        <Stepper
          steps={STEP_DEFINITIONS}
          currentStep={currentStep}
          onStepClick={goToStep}
          allowAllSteps={Boolean(planId)}
          maxAccessibleStep={maxAccessibleStep}
          progressPercent={progressPercent}
        />
      </div>

      {currentStep === 1 ? (
        <PlanDetailsStep
          value={planDetails}
          onChange={setPlanDetails}
          projectGeography={project?.additionalDetails?.geographyDetails ?? {}}
          projectStartDate={project?.startDate}
          projectEndDate={project?.endDate}
          locked={Boolean(planId)}
        />
      ) : null}
      {currentStep === 2 ? (
        <InstallationScopeStep
          planId={planId}
          planCode={existingPlan?.name}
          sectorCode={planDetails.sectorCode}
          value={scope}
          onChange={setScope}
          onBusyChange={setScopeBusy}
          onScopeApplied={(entries) => {
            setScope(entries);
            setScopeApplied(true);
          }}
        />
      ) : null}
      {currentStep === 3 ? (
        <TemplateStep
          planId={planId}
          scope={workflowScope}
          value={templates}
          onChange={setTemplates}
          onBusyChange={setTemplateBusy}
          locked={isPublished}
        />
      ) : null}
      {currentStep === 4 ? (
        <TechnicianAssignmentStep
          scope={workflowScope}
          value={assignments}
          onChange={setAssignments}
          locked={isPublished}
        />
      ) : null}

      {!isPublished ? (
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
          {currentStep < 4 ? (
            <Button type="button" size="sm" className="px-5" onClick={handleNext} disabled={!canGoNext || isNavigationBusy}>
              {translateOr(t, "CORE_COMMON_NEXT", "Next")}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="px-5"
              onClick={() => setConfirmOpen(true)}
              disabled={!isAssignmentValid(assignments, workflowScope) || isNavigationBusy}
            >
              {translateOr(t, "CORE_COMMON_SUBMIT", "Submit")}
            </Button>
          )}
        </WizardActionFooter>
      ) : null}

      <ConfirmSubmitPlanDialog
        open={confirmOpen}
        isSubmitting={savePlan.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void handleConfirmSubmit()}
      />
    </div>
  );
}
