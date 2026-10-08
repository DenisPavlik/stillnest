"use client";

import { useActionState } from "react";

import type { HouseRow } from "@/lib/db/admin";

import { closeDates, type CloseState } from "./actions";
import s from "./admin.module.css";

const INITIAL: CloseState = { ok: false, message: null };

export function CloseForm({ houses, today }: { houses: HouseRow[]; today: string }) {
  const [state, action, pending] = useActionState(closeDates, INITIAL);

  return (
    <form action={action} className={s.form}>
      <label className={s.field}>
        <span>House</span>
        <select name="house" required defaultValue="">
          <option value="" disabled>
            Choose…
          </option>
          {houses.map((h) => (
            <option key={h.slug} value={h.slug}>
              {h.name}
            </option>
          ))}
        </select>
      </label>
      <label className={s.field}>
        <span>First closed night</span>
        <input type="date" name="from" min={today} required />
      </label>
      <label className={s.field}>
        <span>Reopens on</span>
        <input type="date" name="reopens" min={today} required />
      </label>
      <label className={s.field}>
        <span>Why</span>
        <select name="reason" required defaultValue="maintenance">
          <option value="maintenance">Work on the house</option>
          <option value="owner">Owner</option>
          <option value="hold">Hold</option>
        </select>
      </label>
      <label className={`${s.field} ${s.fieldWide}`}>
        <span>Note</span>
        <input type="text" name="note" maxLength={140} placeholder="Shown to guests under “Closed”" />
      </label>
      <div className={s.formFoot}>
        <button type="submit" className={s.primary} disabled={pending}>
          {pending ? "Closing…" : "Close these dates"}
        </button>
        {state.message ? (
          <p className={state.ok ? s.formOk : s.formError} role="status">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
