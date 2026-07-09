import { notFound } from "next/navigation";
import { formatStatus } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  createCountCategory,
  createCountMapping,
  deleteCountCategory,
  deleteCountMapping,
  refreshEventCounts,
  updateCountCategory
} from "../../actions";
import { CountCategoryForm } from "./CountCategoryForm";
import { EventWorkspaceNav } from "../EventWorkspaceNav";

type CountBuilderPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ counts?: string }>;
};

export default async function CountBuilderPage({ params, searchParams }: CountBuilderPageProps) {
  const { id } = await params;
  const { counts } = await searchParams;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      questions: {
        include: {
          options: true,
          countMappings: {
            include: {
              option: true,
              countItem: {
                include: {
                  countCategory: true
                }
              }
            }
          }
        },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }]
      },
      countCategories: {
        include: {
          items: {
            orderBy: { displayOrder: "asc" }
          }
        },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }]
      },
      generatedCounts: {
        include: {
          countCategory: true,
          countItem: true
        },
        orderBy: [{ countCategory: { displayOrder: "asc" } }, { countItem: { displayOrder: "asc" } }]
      }
    }
  });

  if (!event) {
    notFound();
  }

  const addCategory = createCountCategory.bind(null, event.id);
  const addMapping = createCountMapping.bind(null, event.id);
  const refreshCounts = refreshEventCounts.bind(null, event.id);
  const countItems = event.countCategories.flatMap((category) =>
    category.items.map((item) => ({
      id: item.id,
      label: `${category.name}: ${item.label}`
    }))
  );
  const questionsWithOptions = event.questions.filter((question) => question.options.length > 0);
  const registrationCounts = event.generatedCounts.filter((count) => count.sourceFilter === "complete");
  const attendanceCounts = event.generatedCounts.filter(
    (count) => count.sourceFilter === "registered" || count.sourceFilter === "checked_in"
  );

  return (
    <main className="pageShell">
      <header className="simpleTopbar">
        <div>
          <p className="eyebrow">Count Builder</p>
          <h1>{event.name}</h1>
        </div>
        <div className="actions">
          <form action={refreshCounts}>
            <button className="primaryButton" type="submit">Refresh Counts</button>
          </form>
          <a className="secondaryButton" href="/events">Events</a>
        </div>
      </header>
      <EventWorkspaceNav active="counts" eventId={event.id} />

      {counts === "refreshed" ? (
        <section className="section">
          <article className="noticePanel ok">
            <strong>Counts refreshed</strong>
            <span>Totals now reflect completed registrations, mapped answers, and check-ins.</span>
          </article>
        </section>
      ) : null}

      <section className="section editorLayout">
        <article className="panel">
          <div className="panelHeading">
            <h2>Count Categories</h2>
            <span className="statusPill">{event.countCategories.length} total</span>
          </div>

          <div className="builderList">
            {event.countCategories.length === 0 ? (
              <div className="emptyState">
                <strong>No count categories yet</strong>
                <span>Add categories like Meals, Shirts, or Childcare.</span>
              </div>
            ) : event.countCategories.map((category) => {
              const saveCategory = updateCountCategory.bind(null, event.id, category.id);
              const removeCategory = deleteCountCategory.bind(null, event.id, category.id);

              return (
                <details className="builderItem" key={category.id}>
                  <summary>
                    <span>
                      <strong>{category.name}</strong>
                      <small>{formatStatus(category.sourceType)} source</small>
                    </span>
                    <em>{category.items.length} items</em>
                  </summary>
                  <CountCategoryForm action={saveCategory} category={category} submitLabel="Save Category" />
                  <form action={removeCategory} className="deleteForm">
                    <button className="textButton dangerText" type="submit">Delete Category</button>
                  </form>
                </details>
              );
            })}
          </div>
        </article>

        <aside className="panel sidePanel">
          <h2>Add Category</h2>
          <CountCategoryForm action={addCategory} submitLabel="Add Category" />
        </aside>
      </section>

      <section className="section detailGrid">
        <article className="panel">
          <div className="panelHeading">
            <h2>Registration Totals</h2>
            <span className="statusPill">{registrationCounts.length} totals</span>
          </div>
          {registrationCounts.length === 0 ? (
            <div className="emptyState">
              <strong>No generated totals yet</strong>
              <span>Refresh counts after registrations have been submitted.</span>
            </div>
          ) : (
            <div className="barList">
              {registrationCounts.map((count) => {
                const width = `${Math.min(100, Math.max(8, count.total))}%`;
                return (
                  <div key={count.id}>
                    <span>{count.countCategory.name}: {count.countItem?.label ?? "Total"}</span>
                    <b style={{ width }} />
                    <em>{count.total}</em>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panelHeading">
            <h2>Attendance Totals</h2>
            <a className="textButton" href={`/events/${event.id}/checkins`}>Check-In Log</a>
          </div>
          {attendanceCounts.length === 0 ? (
            <div className="emptyState">
              <strong>No attendance totals yet</strong>
              <span>Refresh counts, or check someone in from the scanner.</span>
            </div>
          ) : (
            <div className="barList">
              {attendanceCounts.map((count) => {
                const width = `${Math.min(100, Math.max(8, count.total))}%`;
                const label =
                  count.countCategory.sourceType === "check_in"
                    ? count.countItem?.label ?? "Total"
                    : `${count.countCategory.name}: ${count.countItem?.label ?? "Total"} checked in`;
                return (
                  <div key={count.id}>
                    <span>{label}</span>
                    <b style={{ width }} />
                    <em>{count.total}</em>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </section>

      <section className="section detailGrid">
        <article className="panel">
          <div className="panelHeading">
            <h2>Answer Mapping</h2>
            <span className="statusPill">{event.questions.reduce((total, question) => total + question.countMappings.length, 0)} mapped</span>
          </div>

          <div className="builderList">
            {event.questions.map((question) => (
              <div className="mappingGroup" key={question.id}>
                <strong>{question.label}</strong>
                <span>{formatStatus(question.questionType)} | {formatStatus(question.scope)}</span>
                {question.countMappings.length === 0 ? (
                  <small>No count mappings yet</small>
                ) : question.countMappings.map((mapping) => {
                  const removeMapping = deleteCountMapping.bind(null, event.id, mapping.id);

                  return (
                    <form action={removeMapping} className="mappingRow" key={mapping.id}>
                      <span>{mapping.option?.label ?? "Any answer"}</span>
                      <b>{mapping.countItem.countCategory.name}: {mapping.countItem.label}</b>
                      <em>x{mapping.quantity}</em>
                      <button className="textButton dangerText" type="submit">Remove</button>
                    </form>
                  );
                })}
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Add Mapping</h2>
          <form action={addMapping} className="editorForm compactForm">
            <section className="formSection singleColumn">
              <div>
                <label htmlFor="questionId">Question</label>
                <select id="questionId" name="questionId" required>
                  {questionsWithOptions.map((question) => (
                    <option key={question.id} value={question.id}>{question.label}</option>
                  ))}
                </select>
              </div>
            </section>

            <section className="formSection singleColumn">
              <div>
                <label htmlFor="optionId">Answer option</label>
                <select id="optionId" name="optionId">
                  {questionsWithOptions.flatMap((question) =>
                    question.options.map((option) => (
                      <option key={option.id} value={option.id}>{question.label}: {option.label}</option>
                    ))
                  )}
                </select>
              </div>
            </section>

            <section className="formSection">
              <div>
                <label htmlFor="countItemId">Count item</label>
                <select id="countItemId" name="countItemId" required>
                  {countItems.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="quantity">Quantity</label>
                <input id="quantity" name="quantity" type="number" min="1" defaultValue={1} />
              </div>
            </section>

            <div className="formActions">
              <button className="primaryButton" type="submit" disabled={questionsWithOptions.length === 0 || countItems.length === 0}>Add Mapping</button>
            </div>
          </form>
        </article>
      </section>
    </main>
  );
}
