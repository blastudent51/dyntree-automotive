"use client";
import { defaultSubscriptionSettings } from "@/lib/subscription-settings";
import { SubscriptionAdmin } from "./subscription-admin";
import { apiResult } from "@/lib/client-api";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Loader2,
  ShieldCheck,
  ArrowLeft,
  Check,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  adminResources,
  type AdminResource,
  type AdminField,
} from "@/lib/admin-resources";
import { money } from "@/lib/configuration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@/components/ui/table";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
  SidebarFooter,
} from "@/components/ui/sidebar";
type Row = Record<string, unknown>;
export function AdminPanel({
  initial,
  adminName,
}: {
  initial: Row[];
  adminName: string;
}) {
  const [resource, setResource] = useState(adminResources[0]);
  const [records, setRecords] = useState(initial);
  const [nextOffset, setNextOffset] = useState<number | null>(
    initial.length === 250 ? 250 : null,
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<Row | null>(null);
  const [refund, setRefund] = useState<Row | null>(null);
  const [error, setError] = useState("");
  async function load(r: AdminResource, append = false) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/${r.slug}?offset=${append ? nextOffset || 0 : 0}`,
      );
      const data = await apiResult(response);
      if (!response.ok) throw Error(data.error);
      setResource(r);
      setRecords((previous) =>
        append
          ? [
              ...previous,
              ...data.records.filter(
                (row) => !previous.some((old) => old.id === row.id),
              ),
            ]
          : data.records,
      );
      setNextOffset(data.nextOffset ?? null);
      if (!append) setSearch("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load records.");
    } finally {
      setLoading(false);
    }
  }
  const visible = records.filter((r) =>
    JSON.stringify(r).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <SidebarProvider className="admin-layout">
      <Sidebar className="admin-sidebar" collapsible="offcanvas">
        <SidebarHeader>
          <p className="eyebrow">DYNTREE OPERATIONS</p>
          <strong>
            <ShieldCheck size={17} />
            Administration
          </strong>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {adminResources.map((r) => (
              <SidebarMenuItem key={r.slug}>
                <SidebarMenuButton
                  isActive={resource.slug === r.slug}
                  onClick={() => load(r)}
                >
                  {r.label}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <span>{adminName}</span>
          <Link href="/account">
            <ArrowLeft size={14} />
            My account
          </Link>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="admin-main">
        <main id="main">
          <div className="admin-heading">
            <div>
              <SidebarTrigger />
              <span>OPERATIONS / {resource.label.toUpperCase()}</span>
            </div>
            <p className="status-badge">Administrator access verified</p>
          </div>
          <div className="admin-title">
            <div>
              <h1>{resource.label}</h1>
              <p>
                {resource.readOnly
                  ? "Read-only records for accountability and delivery visibility."
                  : "Manage the Dyntree experience. Changes are validated and recorded in the audit log."}
              </p>
            </div>
            {!resource.readOnly &&
              !["users", "reservations"].includes(resource.slug) && (
                <Button onClick={() => setCreating(true)}>
                  <Plus size={16} />
                  Add record
                </Button>
              )}
          </div>
          {resource.slug === "settings" &&
            !records.some((row) => row.key === "vehicle-subscriptions") && (
              <Button
                type="button"
                variant="outline"
                className="mb-4"
                onClick={() =>
                  setEdit({
                    key: "vehicle-subscriptions",
                    value: defaultSubscriptionSettings,
                  })
                }
              >
                Set up monthly subscriptions
              </Button>
            )}
          {resource.slug === "subscriptions" && (
            <SubscriptionAdmin onSaved={() => load(resource)} />
          )}
          <div className="admin-toolbar">
            <div>
              <Search size={17} />
              <Input
                placeholder={`Search loaded ${resource.label.toLowerCase()}`}
                aria-label="Search loaded records"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <span>
              {visible.length} records
              {nextOffset !== null ? " · more available" : ""}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => load(resource)}
              aria-label="Refresh records"
            >
              <RefreshCw size={16} />
            </Button>
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {loading ? (
            <div className="empty-state">
              <Loader2 className="animate-spin" />
              Loading records…
            </div>
          ) : (
            <Table className="admin-table">
              <TableHeader>
                <TableRow>
                  {resource.columns.map((c) => (
                    <TableHead key={c}>
                      {c.replace(/([A-Z])/g, " $1")}
                    </TableHead>
                  ))}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={String(row.id)}>
                    {resource.columns.map((c) => (
                      <TableCell key={c}>
                        {typeof row[c] === "boolean" ? (
                          row[c] ? (
                            <Check size={15} />
                          ) : (
                            <span>Inactive</span>
                          )
                        ) : c.toLowerCase().includes("cents") ? (
                          money(Number(row[c]))
                        ) : c.endsWith("At") ? (
                          new Date(String(row[c])).toLocaleDateString("en-US")
                        ) : (
                          String(row[c] ?? "—")
                        )}
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="admin-row-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetail(row)}
                        >
                          View
                        </Button>
                        {!resource.readOnly && (
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={`Edit ${String(row.name || row.number || row.key || row.email)}`}
                            onClick={() => setEdit(row)}
                          >
                            <Pencil size={14} />
                          </Button>
                        )}
                        {resource.slug === "reservations" &&
                          ["PAID", "PARTIALLY_REFUNDED"].includes(
                            String(row.paymentStatus),
                          ) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRefund(row)}
                            >
                              Refund
                            </Button>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!visible.length && (
                  <TableRow>
                    <TableCell colSpan={resource.columns.length + 1}>
                      <div className="empty-state">
                        <h3>
                          {search
                            ? "No matching records."
                            : "Nothing here yet."}
                        </h3>
                        <p>
                          {resource.slug === "dealers"
                            ? "Create a dealer only when there is a real Dyntree location."
                            : "Records appear here when created."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {nextOffset !== null && !loading && (
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => load(resource, true)}
            >
              Load more records
            </Button>
          )}
        </main>
      </SidebarInset>
      <Dialog
        open={!!edit || creating}
        onOpenChange={(open) => {
          if (!open) {
            setEdit(null);
            setCreating(false);
          }
        }}
      >
        <DialogContent className="admin-edit-dialog">
          <DialogTitle>
            {edit ? "Edit" : "Add"} {resource.label.toLowerCase()}
          </DialogTitle>
          <DialogDescription>
            Prices use integer US cents. Compatibility and included equipment
            determine the configurator. Every change is audited.
          </DialogDescription>
          {(edit || creating) && (
            <AdminEditor
              key={`${resource.slug}-${String(edit?.id || "new")}`}
              resource={resource}
              row={edit}
              onSaved={() => {
                setEdit(null);
                setCreating(false);
                load(resource);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="admin-edit-dialog">
          <DialogTitle>Record details</DialogTitle>
          <DialogDescription>
            Current stored values for this record.
          </DialogDescription>
          <pre className="record-json">{JSON.stringify(detail, null, 2)}</pre>
        </DialogContent>
      </Dialog>
      <Dialog open={!!refund} onOpenChange={() => setRefund(null)}>
        <DialogContent>
          <DialogTitle>Issue a reservation refund</DialogTitle>
          <DialogDescription>
            Confirm the amount and reason. Type REFUND to send this request to
            Stripe. Simulated reservations are handled locally in development.
          </DialogDescription>
          {refund && (
            <RefundForm
              row={refund}
              onSaved={() => {
                setRefund(null);
                load(resource);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
const settingFields: AdminField[] = [
  {
    key: "amountCents",
    label: "Reservation amount (USD cents)",
    type: "number",
    required: true,
  },
  { key: "refundable", label: "Refundable", type: "checkbox" },
  { key: "available", label: "Reservations available", type: "checkbox" },
  {
    key: "productionWindow",
    label: "Estimated production window",
    required: true,
  },
  {
    key: "language",
    label: "Reservation disclosure",
    type: "textarea",
    required: true,
  },
  {
    key: "agreementVersion",
    label: "Agreement version — change when terms change",
    required: true,
  },
];
const subscriptionFields: AdminField[] = [
  {
    key: "enabled",
    label: "Enable invitation checkout (requires terms and ready vehicles)",
    type: "checkbox",
  },
  { key: "termsVersion", label: "Subscription terms version", required: true },
  {
    key: "terms",
    label:
      "Vehicle-use terms: mileage, insurance, maintenance, availability, cancellation and returns",
    type: "textarea",
    required: true,
  },
  {
    key: "automaticTax",
    label: "Use Stripe automatic tax (configure Stripe Tax first)",
    type: "checkbox",
  },
];
const purchaseFields: AdminField[] = [
  ["financeApr", "Illustrative finance APR (%)"],
  ["leaseMoneyFactor", "Illustrative lease money factor"],
  ["residual24", "24-month residual (% at 10,000 miles/year)"],
  ["residual36", "36-month residual (% at 10,000 miles/year)"],
  ["residual48", "48-month residual (% at 10,000 miles/year)"],
  [
    "mileage12000Reduction",
    "Residual percentage-point reduction at 12,000 miles/year",
  ],
  [
    "mileage15000Reduction",
    "Residual percentage-point reduction at 15,000 miles/year",
  ],
  ["acquisitionFeeCents", "Assumed lease acquisition fee (USD cents)"],
  ["dispositionFeeCents", "Assumed lease return fee (USD cents)"],
  ["excessMileageCents", "Assumed charge per excess mile (USD cents)"],
].map(([key, label]) => ({ key, label, type: "number", required: true }));
function AdminEditor({
  resource,
  row,
  onSaved,
}: {
  resource: AdminResource;
  row: Row | null;
  onSaved: () => void;
}) {
  const subscription =
    resource.slug === "settings" && row?.key === "vehicle-subscriptions";
  const purchase =
    resource.slug === "settings" && row?.key === "purchase-planning";
  const settings =
    resource.slug === "settings" &&
    (row?.key === "reservation" || purchase || subscription);
  const source = (settings ? row?.value : row) as Row | null;
  const fields = subscription
    ? subscriptionFields
    : purchase
      ? purchaseFields
      : settings
        ? settingFields
        : resource.fields;
  const defaults = Object.fromEntries(
    fields.map((f) => {
      const value = source?.[f.key];
      return [
        f.key,
        f.type === "checkbox"
          ? Boolean(value ?? true)
          : f.type === "array"
            ? Array.isArray(value)
              ? value.join(", ")
              : ""
            : f.type === "json"
              ? JSON.stringify(
                  value ?? (f.key === "features" ? [] : {}),
                  null,
                  2,
                )
              : (value ?? (f.type === "number" ? 0 : "")),
      ];
    }),
  );
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { isSubmitting },
  } = useForm<Record<string, unknown>>({ defaultValues: defaults });
  const watched = useWatch({ control });
  const [error, setError] = useState("");
  return (
    <form
      className="admin-editor"
      onSubmit={handleSubmit(async (values) => {
        setError("");
        try {
          const data: Row = {};
          for (const f of fields) {
            const value = values[f.key];
            data[f.key] =
              f.type === "number"
                ? value === ""
                  ? null
                  : Number(value)
                : f.type === "json"
                  ? JSON.parse(String(value))
                  : f.type === "array"
                    ? String(value)
                        .split(",")
                        .map((v) => v.trim())
                        .filter(Boolean)
                    : f.type === "checkbox"
                      ? Boolean(value)
                      : value === "" &&
                          [
                            "trim",
                            "paint",
                            "wheel",
                            "interior",
                            "hex",
                            "imageUrl",
                            "latitude",
                            "longitude",
                          ].includes(f.key)
                        ? null
                        : value;
          }
          const result = await fetch(`/api/admin/${resource.slug}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: row?.id,
              data: settings ? { key: row?.key, value: data } : data,
            }),
          });
          const response = await apiResult(result);
          if (!result.ok) throw Error(response.error);
          toast.success("Changes saved and recorded.");
          onSaved();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not save changes.");
        }
      })}
    >
      {fields.map((f) => (
        <label
          key={f.key}
          className={f.type === "checkbox" ? "admin-checkbox" : ""}
        >
          {f.type === "checkbox" ? (
            <>
              <Checkbox
                checked={Boolean(watched[f.key])}
                onCheckedChange={(v) => setValue(f.key, !!v)}
              />
              {f.label}
            </>
          ) : (
            <>
              {f.label}
              {f.type === "select" ? (
                <Select
                  value={String(watched[f.key] || "")}
                  onValueChange={(v) => setValue(f.key, v)}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={`Choose ${f.label.toLowerCase()}`}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {f.options?.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : f.type === "textarea" || f.type === "json" ? (
                <textarea
                  {...register(f.key)}
                  required={f.required}
                  className="text-input"
                  rows={f.type === "json" ? 5 : 3}
                />
              ) : (
                <input
                  {...register(f.key)}
                  type={f.type === "number" ? "number" : "text"}
                  step={f.type === "number" ? "any" : undefined}
                  required={f.required}
                  className="text-input"
                />
              )}
            </>
          )}
        </label>
      ))}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
        Save changes
      </Button>
    </form>
  );
}
function RefundForm({ row, onSaved }: { row: Row; onSaved: () => void }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      amountCents: Number(row.depositCents),
      reason: "",
      confirmation: "",
    },
  });
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [retrying, setRetrying] = useState(false);
  const pending = (Array.isArray(row.refunds) ? row.refunds : []) as Row[];
  const [error, setError] = useState("");
  return (
    <form
      className="admin-editor"
      onSubmit={handleSubmit(async (values) => {
        setError("");
        try {
          const response = await fetch(
            `/api/admin/reservations/${row.id}/refund`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...values,
                amountCents: Number(values.amountCents),
                idempotencyKey: key,
              }),
            },
          );
          const result = await apiResult(response);
          if (!response.ok) throw Error(result.error);
          toast.success("Refund request processed.");
          onSaved();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Refund failed.");
        }
      })}
    >
      {pending
        .filter((item) =>
          ["PENDING", "pending", "requires_action"].includes(
            String(item.status),
          ),
        )
        .map((item) => (
          <div key={String(item.id)} className="simulation-notice">
            <p>
              {money(Number(item.amountCents))} —{" "}
              {String(item.status).toLowerCase()}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setKey(String(item.idempotencyKey).split(":").at(-1)!);
                setRetrying(true);
                reset({
                  amountCents: Number(item.amountCents),
                  reason: String(item.reason),
                  confirmation: "",
                });
              }}
            >
              Retry / check this refund
            </Button>
          </div>
        ))}
      {retrying && (
        <p>
          Checking the original request. Its amount and reason are preserved.
        </p>
      )}
      <label>
        Amount (USD cents)
        <input
          readOnly={retrying}
          type="number"
          min="1"
          max={Number(row.depositCents)}
          required
          {...register("amountCents")}
          className="text-input"
        />
      </label>
      <label>
        Reason
        <textarea
          readOnly={retrying}
          required
          minLength={5}
          {...register("reason")}
          className="text-input"
        />
      </label>
      <label>
        Type REFUND
        <input
          required
          pattern="REFUND"
          {...register("confirmation")}
          className="text-input"
        />
      </label>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <Button type="submit" variant="destructive" disabled={isSubmitting}>
        {retrying ? "Confirm retry" : "Confirm refund"}
      </Button>
    </form>
  );
}
