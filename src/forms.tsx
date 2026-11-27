import type { Child } from "hono/jsx";
import { characterPath, Support, TextPage } from "./pages";
import {
  blockers,
  type Character,
  contexts,
  type Env,
  type Errors,
  type Feedback,
  feedbackStatuses,
  groups,
  mailto,
  type Offer,
  outcomes,
  productEdit,
  usd,
  type Values,
} from "./store";

export function Field({
  name,
  label,
  values,
  errors,
  kind = "text",
  max,
  options,
  readOnly,
}: {
  name: string;
  label: string;
  values: Values;
  errors: Errors;
  kind?: string;
  max?: number;
  options?: Record<string, string>;
  readOnly?: boolean;
}) {
  const errorId = errors[name] ? `${name}-error` : undefined;
  const accessibility = { "aria-invalid": errorId ? "true" : undefined, "aria-describedby": errorId };
  return (
    <div class={kind === "textarea" ? "field field-wide" : "field"}>
      <label for={name}>{label}</label>
      {options ? (
        <select id={name} name={name} {...accessibility}>
          {Object.entries(options).map(([value, text]) => (
            <option key={value} value={value} selected={value === (values[name] ?? "")}>
              {text}
            </option>
          ))}
        </select>
      ) : kind === "textarea" ? (
        <textarea id={name} name={name} maxlength={max} rows={3} {...accessibility}>
          {values[name] ?? ""}
        </textarea>
      ) : (
        <input
          id={name}
          name={name}
          type={kind}
          value={values[name] ?? ""}
          maxlength={max}
          readonly={readOnly}
          min={kind === "number" ? 0 : undefined}
          step={kind === "number" ? 1 : undefined}
          {...accessibility}
        />
      )}
      {errorId && (
        <p class="error" id={errorId}>
          {errors[name]}
        </p>
      )}
    </div>
  );
}

export function Checkbox({
  name,
  children,
  values,
  errors,
}: {
  name: string;
  children: Child;
  values: Values;
  errors: Errors;
}) {
  return (
    <div>
      <label class="check" for={name}>
        <input
          type="checkbox"
          id={name}
          name={name}
          value="on"
          checked={values[name] === "on"}
          aria-invalid={errors[name] ? "true" : undefined}
          aria-describedby={errors[name] ? `${name}-error` : undefined}
        />
        {children}
      </label>
      {errors[name] && (
        <p class="error" id={`${name}-error`}>
          {errors[name]}
        </p>
      )}
    </div>
  );
}

function FormAlert({ errors, env }: { errors: Errors; env?: Env }) {
  if (Object.keys(errors).length === 0) return null;
  return (
    <div role="alert" class="form-alert">
      <p class="error">{errors.form ?? "Review the fields marked below and try again."}</p>
      {env && (
        <p>
          For help, contact <Support env={env} />.
        </p>
      )}
    </div>
  );
}

export function FeedbackForm({
  env,
  catalog,
  values,
  errors,
}: {
  env: Env;
  catalog: Character[];
  values: Values;
  errors: Errors;
}) {
  const context = values.context ?? "before";
  const options = {
    "": "Choose a character (optional)",
    ...Object.fromEntries(catalog.map((c) => [c.slug, c.details.name ?? c.slug])),
  };
  if (context === "notify") options[""] = "Choose a character";
  if (values.character && !Object.hasOwn(options, values.character)) {
    Object.assign(options, { [values.character]: "Previously selected character (unavailable)" });
  }
  return (
    <TextPage title="Share feedback">
      <p>Tell us what worked or what got in your way. Feedback is optional.</p>
      <nav aria-label="Feedback type">
        {Object.entries(contexts).map(([key, label]) => (
          <a
            key={key}
            href={`/feedback?context=${key}${values.character ? `&character=${encodeURIComponent(values.character)}` : ""}`}
            aria-current={context === key ? "page" : undefined}
          >
            {label}
          </a>
        ))}
      </nav>
      <form method="post" action="/feedback" novalidate>
        <FormAlert errors={errors} env={env} />
        <input type="hidden" name="context" value={context} />
        <Field name="character" label="Character" options={options} values={values} errors={errors} />
        {context === "after" && (
          <fieldset>
            <legend>Did you get a usable shot?</legend>
            {Object.entries(outcomes).map(([value, label]) => (
              <label key={value} class="check" for={`outcome-${value}`}>
                <input
                  type="radio"
                  id={`outcome-${value}`}
                  name="outcome"
                  value={value}
                  checked={values.outcome === value}
                  aria-invalid={errors.outcome ? "true" : undefined}
                  aria-describedby={errors.outcome ? "outcome-error" : undefined}
                />
                {label}
              </label>
            ))}
            {errors.outcome && (
              <p id="outcome-error" class="error">
                {errors.outcome}
              </p>
            )}
          </fieldset>
        )}
        <Field
          name="message"
          label="Message (optional)"
          values={values}
          errors={errors}
          kind="textarea"
          max={1000}
        />
        <Field
          name="email"
          label="Email (needed if you opt in below)"
          values={values}
          errors={errors}
          kind="email"
          max={254}
        />
        <fieldset>
          <legend>Contact permissions</legend>
          <Checkbox name="reply" values={values} errors={errors}>
            You may email me a reply to this feedback.
          </Checkbox>
          <Checkbox name="research" values={values} errors={errors}>
            You may invite me to a research interview.
          </Checkbox>
          {context === "notify" && (
            <Checkbox name="notify" values={values} errors={errors}>
              Email me when this pack is available.
            </Checkbox>
          )}
        </fieldset>
        <div class="honeypot" aria-hidden="true">
          <label for="website">Leave blank</label>
          <input id="website" name="website" tabindex={-1} autocomplete="off" />
        </div>
        <p>
          <a href="/privacy">How we handle your feedback</a>
        </p>
        <button class="primary" type="submit">
          Send feedback
        </button>
      </form>
    </TextPage>
  );
}

export function Admin({ title, children }: { title: string; children: Child }) {
  return (
    <section class="admin">
      <h1>{title}</h1>
      {children}
    </section>
  );
}

function Table({ labels, children, name }: { labels: string[]; children: Child; name: string }) {
  return (
    <table class="admin-table" aria-label={name} role="table">
      <thead role="rowgroup">
        <tr role="row">
          {labels.map((label) => (
            <th key={label} scope="col" role="columnheader">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody role="rowgroup">{children}</tbody>
    </table>
  );
}

function Cell({ label, children }: { label: string; children: Child }) {
  return (
    <td role="cell">
      <span class="table-label" aria-hidden="true">
        {label}{" "}
      </span>
      {children}
    </td>
  );
}

export function AdminCatalog({ catalog }: { catalog: Character[] }) {
  return (
    <Admin title="Characters">
      <div class="actions">
        <a class="button primary" href="/admin/characters/new">
          New character
        </a>
        <a href="https://gumroad.com/customers">Orders in Gumroad</a>
      </div>
      {catalog.length ? (
        <Table
          labels={["Character", "Status", "Sale mode", "Order", "Price", "Preview"]}
          name="Character listings"
        >
          {catalog.map((c) => (
            <tr key={c.id} role="row">
              <Cell label="Character">
                <a href={`/admin/characters/${c.id}`}>{c.details.name || c.slug}</a>
              </Cell>
              <Cell label="Status">{c.status}</Cell>
              <Cell label="Sale mode">{c.sale_mode}</Cell>
              <Cell label="Order">{c.display_order}</Cell>
              <Cell label="Price">{usd(c.price)}</Cell>
              <Cell label="Preview">
                <a
                  href={`/admin/characters/${c.id}/preview`}
                  aria-label={`Preview ${c.details.name || c.slug}`}
                >
                  Preview
                </a>
              </Cell>
            </tr>
          ))}
        </Table>
      ) : (
        <p>No characters yet.</p>
      )}
    </Admin>
  );
}

export function editorValues(c: Character | null): Values {
  if (!c)
    return { displayOrder: "0", price: "2900", saleMode: "notify", licenseVersion: "1.0", revision: "0" };
  return {
    ...c.details,
    slug: c.slug,
    displayOrder: String(c.display_order),
    price: String(c.price),
    saleMode: c.sale_mode,
    productId: c.product_id ?? "",
    revision: String(c.revision),
  };
}

export function CharacterEditor({
  c,
  values,
  errors,
  csrf,
  notice,
}: {
  c: Character | null;
  values: Values;
  errors: Errors;
  csrf: string;
  notice?: string;
}) {
  const path = c ? `/admin/characters/${c.id}` : "/admin/characters/new";
  const locked = c?.status === "published";
  const editUrl = productEdit(c?.details.editUrl);
  return (
    <Admin title={c?.details.name || (c ? "Edit character" : "New character")}>
      <div class="actions">
        <a href="/admin">← Characters</a>
        {c && (
          <a class="button" href={`${path}/preview`}>
            Preview
          </a>
        )}
        {locked && <a href={characterPath(c.slug)}>Public page</a>}
        {editUrl && (
          <a href={editUrl} rel="noreferrer">
            Edit on Gumroad
          </a>
        )}
      </div>
      {notice && <p role="status">{notice}</p>}
      <p>
        Status <strong>{c?.status ?? "draft"}</strong>
      </p>
      <form method="post" action={path} novalidate>
        <input type="hidden" name="_csrf" value={csrf} />
        <input type="hidden" name="revision" value={values.revision ?? "0"} />
        <FormAlert errors={errors} />
        {locked ? (
          <>
            <p>
              Hide the listing before changing details or price. Stop the sale on Gumroad as well when pulling
              a pack.
            </p>
            <Field name="displayOrder" label="Display order" values={values} errors={errors} kind="number" />
            <div class="actions">
              <button type="submit" class="primary" name="action" value="order">
                Save order
              </button>
              <button type="submit" name="action" value="hide">
                Hide listing
              </button>
            </div>
          </>
        ) : (
          <>
            {groups.map(([group, entries]) => (
              <fieldset key={group}>
                <legend>{group}</legend>
                <div class="editor-group">
                  {Array.from<readonly [string, string, number, string?]>(entries).map(
                    ([name, label, max, kind]) => (
                      <Field
                        key={name}
                        name={name}
                        label={label}
                        values={values}
                        errors={errors}
                        kind={kind}
                        max={max}
                        options={kind === "sale" ? { notify: "Notify", buy: "Buy" } : undefined}
                        readOnly={name === "slug" && !!c?.first_published}
                      />
                    ),
                  )}
                </div>
              </fieldset>
            ))}
            {c && (
              <Checkbox name="confirm" values={values} errors={errors}>
                I compared the preview, checkout price and file manifest.
              </Checkbox>
            )}
            <div class="actions">
              <button type="submit" class="primary" name="action" value="save">
                {c?.status === "hidden" ? "Save changes" : "Save draft"}
              </button>
              {c && (
                <button type="submit" name="action" value="publish">
                  Publish
                </button>
              )}
            </div>
          </>
        )}
      </form>
    </Admin>
  );
}

export function Settings({
  offer,
  values,
  errors,
  csrf,
  saved,
}: {
  offer: Offer;
  values?: Values;
  errors: Errors;
  csrf: string;
  saved?: boolean;
}) {
  const input = values ?? {
    offer_on: offer.offer_on ? "on" : "",
    offer_price: String(offer.offer_price),
    offer_cap: String(offer.offer_cap),
  };
  return (
    <Admin title="Store settings">
      <h2>Opening offer</h2>
      <p>
        Gumroad applies the shared discount and enforces the cap. Check redemptions twice daily and turn off
        the offer copy when it ends.
      </p>
      {saved && <p role="status">Settings saved.</p>}
      <form method="post" action="/admin/settings" novalidate>
        <input type="hidden" name="_csrf" value={csrf} />
        <FormAlert errors={errors} />
        <Checkbox name="offer_on" values={input} errors={errors}>
          Show the opening offer
        </Checkbox>
        <Field
          name="offer_price"
          label="Offer price in USD cents"
          values={input}
          errors={errors}
          kind="number"
        />
        <Field name="offer_cap" label="Shared pack cap" values={input} errors={errors} kind="number" />
        <button class="primary" type="submit">
          Save settings
        </button>
      </form>
      <section class="section">
        <h2>Gumroad operations</h2>
        <nav aria-label="Gumroad operations">
          <a href="https://gumroad.com/customers">Sales, receipt resends, refunds and export</a>
          <a href="https://gumroad.com/discounts">Discounts</a>
          <a href="https://gumroad.com/products">Products</a>
        </nav>
        <p>
          Stop sales on both Open Bestie and Gumroad for a takedown. Change a listing price only while the
          listing is hidden, and compare the new price at checkout before publishing.
        </p>
      </section>
    </Admin>
  );
}

function Consent({ row }: { row: Feedback }) {
  const permissions = [row.reply && "Reply", row.research && "Research", row.notify && "Notify"].filter(
    Boolean,
  );
  return <>{permissions.join(", ") || "None"}</>;
}

export function Inbox({ rows, counts }: { rows: Feedback[]; counts: Record<string, number> }) {
  return (
    <Admin title="Feedback inbox">
      <section aria-labelledby="recent">
        <h2 id="recent">Distinct reporters in the last 14 days</h2>
        <ul class="feedback-summary">
          {Object.entries(blockers).map(([key, name]) => (
            <li key={key}>
              {name} · {counts[key] ?? 0}
            </li>
          ))}
        </ul>
      </section>
      {rows.length ? (
        <Table
          labels={["Report", "Context", "Character", "Outcome", "Permissions", "Blocker", "Status"]}
          name="Feedback reports"
        >
          {rows.map((row) => (
            <tr key={row.id} role="row">
              <Cell label="Report">
                <a href={`/admin/feedback/${row.id}`}>Report {row.id}</a>
              </Cell>
              <Cell label="Context">{contexts[row.context]}</Cell>
              <Cell label="Character">{row.character_name ?? "—"}</Cell>
              <Cell label="Outcome">{row.outcome ? outcomes[row.outcome] : "—"}</Cell>
              <Cell label="Permissions">
                <Consent row={row} />
              </Cell>
              <Cell label="Blocker">{row.blocker ? blockers[row.blocker] : "—"}</Cell>
              <Cell label="Status">{feedbackStatuses[row.status]}</Cell>
            </tr>
          ))}
        </Table>
      ) : (
        <p>No feedback yet.</p>
      )}
    </Admin>
  );
}

export function FeedbackItem({
  row,
  values,
  errors,
  csrf,
  saved,
}: {
  row: Feedback;
  values?: Values;
  errors: Errors;
  csrf: string;
  saved?: boolean;
}) {
  const input = values ?? {
    blocker: row.blocker ?? "",
    status: row.status,
    reply_date: row.reply_date ?? "",
    resolution: row.resolution ?? "",
    note: row.note ?? "",
    order_ref: row.order_ref ?? "",
  };
  return (
    <Admin title={`Feedback report ${row.id}`}>
      <div class="actions">
        <a href="/admin/feedback">← Feedback inbox</a>
      </div>
      {saved && <p role="status">Feedback updated.</p>}
      <dl>
        <dt>Received (UTC)</dt>
        <dd>{row.created_at}</dd>
        <dt>Context</dt>
        <dd>{contexts[row.context]}</dd>
        <dt>Character</dt>
        <dd>{row.character_name ?? "—"}</dd>
        <dt>Outcome</dt>
        <dd>{row.outcome ? outcomes[row.outcome] : "—"}</dd>
        <dt>Contact permission</dt>
        <dd>
          <Consent row={row} />
        </dd>
        {row.email && (row.reply || row.research || row.notify) ? (
          <>
            <dt>Permitted contact</dt>
            <dd>
              <a href={mailto(row.email)}>{row.email}</a>
            </dd>
          </>
        ) : null}
        <dt>Message</dt>
        <dd>{row.message ?? "—"}</dd>
      </dl>
      <form method="post" action={`/admin/feedback/${row.id}`} novalidate>
        <input type="hidden" name="_csrf" value={csrf} />
        <FormAlert errors={errors} />
        <Field
          name="blocker"
          label="Blocker"
          options={{ "": "Unassigned", ...blockers }}
          values={input}
          errors={errors}
        />
        <Field name="status" label="Status" options={feedbackStatuses} values={input} errors={errors} />
        <Field name="reply_date" label="Reply date" values={input} errors={errors} kind="date" />
        <Field name="resolution" label="Support outcome" values={input} errors={errors} max={200} />
        <Field name="note" label="Private note" values={input} errors={errors} kind="textarea" max={1000} />
        <Field name="order_ref" label="Optional order reference" values={input} errors={errors} max={120} />
        <button class="primary" type="submit">
          Save feedback
        </button>
      </form>
    </Admin>
  );
}
