import { translateOr, useTranslate } from "@/shared";
import { Badge, Button, Pagination, Skeleton, Tooltip, TooltipContent, TooltipTrigger } from "@/ui";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { ORG_USER_PAGE_SIZE } from "../../constants/config";
import { roleGroupId, type OrgRoleGroup, type OrgUser } from "../../types/organisation";

interface OrgUserTableProps {
  users: OrgUser[];
  isLoading: boolean;
  groupsForRoleCodes: (roleCodes: string[]) => OrgRoleGroup[];
  onAdd: () => void;
  onEdit: (user: OrgUser) => void;
  onDelete: (user: OrgUser) => void;
}

const HEADER_CELL = "px-5 py-3 text-left text-sm font-semibold text-ink-950";

export function OrgUserTable({ users, isLoading, groupsForRoleCodes, onAdd, onEdit, onDelete }: OrgUserTableProps) {
  const { t } = useTranslate();
  const [pageOffset, setPageOffset] = useState(0);
  const [pageSize, setPageSize] = useState(ORG_USER_PAGE_SIZE);

  // Keep the page in range after a delete empties the last page.
  const safeOffset = pageOffset >= users.length && pageOffset > 0 ? Math.max(0, pageOffset - pageSize) : pageOffset;
  const pageUsers = users.slice(safeOffset, safeOffset + pageSize);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-foreground">
          {translateOr(t, "ORG_USER_LIST", "Users")}
          {users.length > 0 ? <span className="ml-2 text-sm font-normal text-muted-foreground">({users.length})</span> : null}
        </h2>
        <Button type="button" size="sm" onClick={onAdd}>
          <UserPlus className="size-4" />
          {translateOr(t, "ADD_USER", "Add User")}
        </Button>
      </div>

      {isLoading ? (
        <div className="livelihood-card p-6">
          <Skeleton className="h-48 w-full" />
        </div>
      ) : users.length === 0 ? (
        <div className="livelihood-card px-6 py-12 text-center text-sm text-muted-foreground">
          {translateOr(t, "CS_NO_ORG_USERS_FOUND", "No users have been added to this organisation yet")}
        </div>
      ) : (
        <div className="livelihood-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className={HEADER_CELL}>{translateOr(t, "ORG_USER_NAME", "Name")}</th>
                  <th className={HEADER_CELL}>{translateOr(t, "ORG_USER_USERNAME", "Username")}</th>
                  <th className={HEADER_CELL}>{translateOr(t, "ORG_USER_CONTACT", "Contact")}</th>
                  <th className={HEADER_CELL}>{translateOr(t, "ORG_USER_EMAIL", "Email")}</th>
                  <th className={HEADER_CELL}>{translateOr(t, "ORG_USER_ROLES", "Roles")}</th>
                  <th className={`${HEADER_CELL} text-right`}>{translateOr(t, "ORG_USER_ACTIONS", "Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {pageUsers.map((user, index) => {
                  const groups = groupsForRoleCodes(user.roleCodes);
                  return (
                    <tr
                      key={user.orgUserId}
                      className={"border-b border-border/70 " + (index % 2 === 1 ? "bg-accent" : "")}
                    >
                      <td className="px-5 py-4 font-semibold text-foreground">{user.name || "-"}</td>
                      <td className="px-5 py-4 text-foreground">{user.userName || "-"}</td>
                      <td className="px-5 py-4 text-foreground">{user.mobileNumber || "-"}</td>
                      <td className="px-5 py-4 text-foreground">{user.emailId || "-"}</td>
                      <td className="px-5 py-4">
                        {groups.length === 0 ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {groups.map((group) => (
                              <Badge key={roleGroupId(group)} variant="secondary">
                                {group.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={translateOr(t, "CORE_COMMON_EDIT", "Edit")}
                                onClick={() => onEdit(user)}
                              >
                                <Pencil className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{translateOr(t, "CORE_COMMON_EDIT", "Edit")}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={translateOr(t, "CORE_COMMON_DELETE", "Delete")}
                                className="text-destructive hover:text-destructive"
                                onClick={() => onDelete(user)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{translateOr(t, "CORE_COMMON_DELETE", "Delete")}</TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {users.length > pageSize || safeOffset > 0 ? (
        <Pagination
          currentPage={Math.floor(safeOffset / pageSize)}
          totalRecords={users.length}
          pageSizeLimit={pageSize}
          onNextPage={() => setPageOffset(safeOffset + pageSize)}
          onPrevPage={() => setPageOffset(Math.max(0, safeOffset - pageSize))}
          onPageChange={(page) => setPageOffset(page * pageSize)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageOffset(0);
          }}
        />
      ) : null}
    </section>
  );
}
