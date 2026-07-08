import { EventStatus, EventVisibility, type Event } from "@prisma/client";
import { formatDateTimeInput, formatStatus } from "@/lib/format";

type EventFormProps = {
  action: (formData: FormData) => void;
  event?: Event;
  submitLabel: string;
};

const statusOptions: EventStatus[] = ["draft", "open", "closed", "archived"];
const visibilityOptions: EventVisibility[] = ["public", "private"];

export function EventForm({ action, event, submitLabel }: EventFormProps) {
  return (
    <form action={action} className="editorForm">
      <section className="formSection">
        <div>
          <label htmlFor="name">Event name</label>
          <input id="name" name="name" required defaultValue={event?.name ?? ""} />
        </div>
        <div>
          <label htmlFor="locationName">Location</label>
          <input id="locationName" name="locationName" defaultValue={event?.locationName ?? ""} />
        </div>
      </section>

      <section className="formSection">
        <div>
          <label htmlFor="startsAt">Starts</label>
          <input id="startsAt" name="startsAt" type="datetime-local" required defaultValue={formatDateTimeInput(event?.startsAt)} />
        </div>
        <div>
          <label htmlFor="endsAt">Ends</label>
          <input id="endsAt" name="endsAt" type="datetime-local" defaultValue={formatDateTimeInput(event?.endsAt)} />
        </div>
      </section>

      <section className="formSection">
        <div>
          <label htmlFor="registrationOpensAt">Registration opens</label>
          <input id="registrationOpensAt" name="registrationOpensAt" type="datetime-local" defaultValue={formatDateTimeInput(event?.registrationOpensAt)} />
        </div>
        <div>
          <label htmlFor="registrationClosesAt">Registration closes</label>
          <input id="registrationClosesAt" name="registrationClosesAt" type="datetime-local" defaultValue={formatDateTimeInput(event?.registrationClosesAt)} />
        </div>
      </section>

      <section className="formSection">
        <div>
          <label htmlFor="capacity">Capacity</label>
          <input id="capacity" name="capacity" type="number" min="0" defaultValue={event?.capacity ?? ""} />
        </div>
        <div>
          <label htmlFor="imageUrl">Image URL</label>
          <input id="imageUrl" name="imageUrl" defaultValue={event?.imageUrl ?? ""} />
        </div>
      </section>

      <section className="formSection">
        <div>
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={event?.status ?? "draft"}>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{formatStatus(status)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="visibility">Visibility</label>
          <select id="visibility" name="visibility" defaultValue={event?.visibility ?? "public"}>
            {visibilityOptions.map((visibility) => (
              <option key={visibility} value={visibility}>{formatStatus(visibility)}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="formSection singleColumn">
        <div>
          <label htmlFor="description">Public description</label>
          <textarea id="description" name="description" rows={4} defaultValue={event?.description ?? ""} />
        </div>
      </section>

      <section className="formSection singleColumn">
        <div>
          <label htmlFor="internalNotes">Internal notes</label>
          <textarea id="internalNotes" name="internalNotes" rows={4} defaultValue={event?.internalNotes ?? ""} />
        </div>
      </section>

      <label className="checkRow">
        <input name="isPaid" type="checkbox" defaultChecked={event?.isPaid ?? false} />
        <span>Payments are part of this event</span>
      </label>

      <div className="formActions">
        <a className="secondaryButton" href={event ? `/events/${event.id}` : "/events"}>Cancel</a>
        <button className="primaryButton" type="submit">{submitLabel}</button>
      </div>
    </form>
  );
}
