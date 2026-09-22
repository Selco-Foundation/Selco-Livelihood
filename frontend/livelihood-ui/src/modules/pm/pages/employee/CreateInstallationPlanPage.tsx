import { extractApiErrorMessage, translateOr, useAuthStore, useTranslate, employeeHomePath } from "@/shared";
import { Button, TopBar } from "@/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ConfirmSubmitDialog } from "../../components/ConfirmSubmitDialog";
import { WizardStepper } from "../../components/WizardStepper";
import { WizardSuccessCard } from "../../components/WizardSuccessCard";
import {
  isAssignmentValid,
  TechnicianAssignmentStep,
  toRows,
  toSavedAssignments,
  type AssignmentValue,
} from "../../components/steps/TechnicianAssignmentStep";
import { InstallationScopeStep, isScopeValid, type ScopeValue } from "../../components/steps/InstallationScopeStep";
import { isPlanDetailsValid, PlanDetailsStep, type PlanDetailsValue } from "../../components/steps/PlanDetailsStep";
import { isTemplateStepValid, TemplateStep, type TemplateValue } from "../../components/steps/TemplateStep";
import { WizardActionFooter } from "../../components/WizardActionFooter";
import { pmKeys } from "../../hooks/query-keys";
import { useInstallationPlanById } from "../../hooks/use-installation-plan-by-id";
import { useInstallationPlanReviewer } from "../../hooks/use-installation-plan-reviewer";
import { useInstallationPlanScope } from "../../hooks/use-installation-plan-scope";
import { useInstallationPlanTemplates } from "../../hooks/use-installation-plan-templates";
import { useProjectById } from "../../hooks/use-project-by-id";
import { useSaveInstallationPlan } from "../../hooks/use-save-installation-plan";
import { useVendorAssignmentSearch } from "../../hooks/use-vendor-assignment-search";
import type { InstallationPlanRouteSearch } from "../../routes";
import { publishInstallationPlan } from "../../services/installation-plan";
import { validateVendorAssignment } from "../../services/vendor-assignment";
import type { InstallationPlan } from "../../types/installation-plan";
import { pmMyProjectsPath, pmProjectDetailsPath } from "../../utils/paths";
import { tenantId } from "@/shared/config/global-config";

export function CreateInstallationPlanPage() {
  const { t } = useTranslate();

  const STEP_DEFINITIONS = [
    { label: translateOr(t, "ES_PM_PLAN_DETAILS_STEP", "Plan Details") },
    { label: translateOr(t, "ES_PM_INSTALLATION_SCOPE_STEP", "Installation Scope") },
    { label: translateOr(t, "ES_PM_TEMPLATE_STEP", "Template") },
    { label: translateOr(t, "ES_PM_TECHNICIAN_ASSIGNMENT_STEP", "Technician Assignment") },
  ];
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
  const { data: assignedReviewer } = useInstallationPlanReviewer(planId);
  const { data: savedScope } = useInstallationPlanScope(planId);
  const { data: savedTemplates } = useInstallationPlanTemplates(planId);
  const savePlan = useSaveInstallationPlan();
  const queryClient = useQueryClient();
  const { data: vendorAssignmentSearch } = useVendorAssignmentSearch(planId, currentStep === 4);
  const assignmentRows = useMemo(() => toRows(vendorAssignmentSearch?.sites ?? []), [vendorAssignmentSearch]);
  const savedAssignments = useMemo(
    () => toSavedAssignments(vendorAssignmentSearch?.sites ?? []),
    [vendorAssignmentSearch],
  );
  const accessToken = useAuthStore((state) => state.accessToken);
  const authUser = useAuthStore((state) => state.user);

  const [planDetails, setPlanDetails] = useState<PlanDetailsValue>({
    geographyDetails: {},
    sectorCodes: [],
    reviewerCode: "",
  });
  const [scope, setScope] = useState<ScopeValue>([]);
  const [templates, setTemplates] = useState<TemplateValue>([]);
  const [assignments, setAssignments] = useState<AssignmentValue>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmError, setConfirmError] = useState<string | undefined>(undefined);
  const [isPublishing, setIsPublishing] = useState(false);
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
    // reviewerCode is intentionally left out here and preserved from prior state: the assigned
    // reviewer is never part of this response (see the dedicated effect below), so resetting it
    // to "" on every hydration would clobber that effect's result if existingPlan ever refetches.
    setPlanDetails((prev) => ({
      geographyDetails: existingPlan.geographyDetails ?? {},
      sectorCodes: existingPlan.additionalDetails?.sectorCodes ?? [],
      reviewerCode: prev.reviewerCode,
      startDate: existingPlan.startDate,
      endDate: existingPlan.endDate,
    }));
    // scope, templates and assignments are intentionally left out here too, for the same reason
    // as reviewerCode: none of them is part of this response (see the dedicated effects below),
    // so resetting them on every hydration would wipe out those effects' results if existingPlan
    // ever refetches.
    setIsPlanHydrated(true);
  }, [existingPlan, planId]);

  // The assigned reviewer lives in field-planner-activity's activity_assignments, not on
  // field-planner's own FieldPlan response, so it can't come from the hydration effect above —
  // it resolves separately and is patched in once available. Guarded on reviewerCode still being
  // empty so it can't clobber a value the PM has since changed.
  useEffect(() => {
    if (!planId || !assignedReviewer) return;
    setPlanDetails((prev) => (prev.reviewerCode ? prev : { ...prev, reviewerCode: assignedReviewer }));
  }, [assignedReviewer, planId]);

  // The plan's real Installation Scope lives in field_plan_facilities, not on field-planner's own
  // FieldPlan response either -- same reason, own effect. Guarded on scope still being empty so a
  // scope just uploaded this session (or a re-upload with different entries) isn't clobbered by a
  // stale fetch resolving late.
  useEffect(() => {
    if (!planId || !savedScope || savedScope.length === 0) return;
    setScope((prev) => (prev.length > 0 ? prev : savedScope));
  }, [savedScope, planId]);

  // Same reasoning again for the plan's already-uploaded IC report templates -- field_plan_template
  // rows live outside field-planner's FieldPlan object too.
  useEffect(() => {
    if (!planId || !savedTemplates || savedTemplates.length === 0) return;
    setTemplates((prev) => (prev.length > 0 ? prev : savedTemplates));
  }, [savedTemplates, planId]);

  // ...and once more for the saved technician assignments. `additionalDetails.assignments` is
  // never echoed back by field-planner either, so reopening a draft used to land on step 4 with
  // every dropdown blank even though the vendors had been saved. They do come back on the
  // vendor-assignment search already loaded above — each asset carries its own vendor fields —
  // so they're flattened out of that rather than fetched again. Same empty-guard as the others.
  useEffect(() => {
    if (!planId || !savedAssignments || savedAssignments.length === 0) return;
    setAssignments((prev) => (prev.length > 0 ? prev : savedAssignments));
  }, [savedAssignments, planId]);

  // A new plan's dates default to the project's own start date and one month past it, capped at
  // the project's own end date if that's sooner — never left blank for the PM to fill in from
  // scratch. Only for a brand-new plan (existingPlan's own dates already win via the hydration
  // effect above), and only once: guarded on startDate still being unset so it doesn't clobber a
  // date the PM has since edited.
  useEffect(() => {
    if (planId || !project?.startDate || planDetails.startDate !== undefined) return;
    const oneMonthOut = new Date(project.startDate);
    oneMonthOut.setMonth(oneMonthOut.getMonth() + 1);
    const defaultEndDate = project.endDate ? Math.min(oneMonthOut.getTime(), project.endDate) : oneMonthOut.getTime();
    setPlanDetails((prev) => ({ ...prev, startDate: project.startDate, endDate: defaultEndDate }));
  }, [project, planId, planDetails.startDate]);

  const isPublished = existingPlan?.additionalDetails?.status === "PUBLISHED";

  const uniqueSolutionCodes = useMemo(
    () =>
      Array.from(new Set(scope.filter((entry) => entry.included && entry.solutionCode).map((entry) => entry.solutionCode!))),
    [scope],
  );

  async function persistPlan(): Promise<InstallationPlan> {
    const plan: InstallationPlan = {
      id: planId,
      tenantId: project?.tenantId ?? tenantId(),
      projectId: projectId!,
      name: existingPlan?.name,
      geographyDetails: planDetails.geographyDetails,
      startDate: planDetails.startDate,
      endDate: planDetails.endDate,
      additionalDetails: {
        ...existingPlan?.additionalDetails,
        sectorCodes: planDetails.sectorCodes,
        reviewerCode: planDetails.reviewerCode,
        scope,
        templates,
        assignments,
      },
    };
    return savePlan.mutateAsync(plan);
  }

  const isPlanDetailsComplete = isPlanDetailsValid(planDetails, project?.startDate, project?.endDate);
  const isScopeComplete = scopeApplied || isScopeValid(scope);
  const isTemplateComplete = isTemplateStepValid(templates, uniqueSolutionCodes);
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
    setConfirmError(undefined);
    setIsPublishing(true);
    try {
      const saved = await persistPlan();

      // Publishing is irreversible, so ask the server to check the assignments first. This
      // endpoint writes nothing and always 200s — it just reports per-row problems the client
      // can't see (REVIEWER_MISSING, VENDOR_MISMATCH, a vendor who left the org since being
      // picked). Without it a plan with any of those goes straight through and can't be undone.
      const validation = await validateVendorAssignment(saved.id!, assignments, accessToken ?? undefined, authUser);
      if (!validation.valid) {
        setConfirmError(
          validation.errors
            .map((issue) => issue.message)
            .filter(Boolean)
            .join("\n") ||
            translateOr(
              t,
              "ES_PM_INSTALLATION_PLAN_VALIDATION_FAILED",
              "This installation plan can't be submitted yet. Please review the technician assignments.",
            ),
        );
        return;
      }

      await publishInstallationPlan(saved.id!, assignments, accessToken ?? undefined, authUser);
      // Publishing flips the plan's status to PUBLISHED, which drives the read-only
      // locking on every step. Without this the cache keeps serving the DRAFT plan.
      await queryClient.invalidateQueries({ queryKey: pmKeys.plans() });
      setConfirmOpen(false);
      setJustPublished(true);
    } catch (error) {
      setConfirmError(
        extractApiErrorMessage(error) ??
          translateOr(
            t,
            "ES_PM_INSTALLATION_PLAN_SUBMIT_FAILED",
            "Failed to submit the installation plan. Please try again.",
          ),
      );
    } finally {
      setIsPublishing(false);
    }
  }

  if (justPublished) {
    return (
      <WizardSuccessCard
        title={translateOr(t, "ES_PM_INSTALLATION_PLAN_CREATED", "Installation Plan Created!")}
        itemLabel={translateOr(t, "ES_PM_INSTALLATION_PLAN_NAME", "Installation Plan Name")}
        itemName={existingPlan?.name}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void rawNavigate({ to: employeeHomePath() })}>
              {translateOr(t, "CORE_COMMON_OVERVIEW", "Overview")}
            </Button>
            <Button size="sm" onClick={() => void rawNavigate({ to: pmProjectDetailsPath(), search: { projectId } })}>
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

      <WizardStepper
        steps={STEP_DEFINITIONS}
        currentStep={currentStep}
        onStepChange={goToStep}
        isStepClickable={(step) => step <= maxAccessibleStep}
        allCompleted={isPublished}
      />

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
          projectId={projectId}
          projectGeography={project?.additionalDetails?.geographyDetails ?? {}}
          sectorCodes={planDetails.sectorCodes}
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
          planCode={existingPlan?.name}
          scope={scope}
          projectGeography={project?.additionalDetails?.geographyDetails ?? {}}
          value={templates}
          onChange={setTemplates}
          onBusyChange={setTemplateBusy}
          locked={isPublished}
        />
      ) : null}
      {currentStep === 4 ? (
        <TechnicianAssignmentStep
          planId={planId}
          planCode={existingPlan?.name}
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
              disabled={!isAssignmentValid(assignments, assignmentRows) || isNavigationBusy}
            >
              {translateOr(t, "CORE_COMMON_SUBMIT", "Submit")}
            </Button>
          )}
        </WizardActionFooter>
      ) : null}

      <ConfirmSubmitDialog
        open={confirmOpen}
        descriptionKey="ES_PM_CONFIRM_SUBMIT_PLAN_DESCRIPTION"
        descriptionFallback="Once this Installation Plan is submitted, you won't be able to add any new end-user sites. You can still remove an existing site, but only if no Installation Report has been submitted for it."
        isSubmitting={savePlan.isPending || isPublishing}
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
