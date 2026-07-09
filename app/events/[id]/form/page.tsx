import { notFound } from "next/navigation";
import { formatStatus } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { createQuestion, deleteQuestion, updateQuestion } from "../../actions";
import { QuestionForm } from "./QuestionForm";
import { EventWorkspaceNav } from "../EventWorkspaceNav";

type FormBuilderPageProps = {
  params: Promise<{ id: string }>;
};

export default async function FormBuilderPage({ params }: FormBuilderPageProps) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      questions: {
        include: { options: true },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }]
      }
    }
  });

  if (!event) {
    notFound();
  }

  const addQuestion = createQuestion.bind(null, event.id);

  return (
    <main className="pageShell">
      <header className="simpleTopbar">
        <div>
          <p className="eyebrow">Form Builder</p>
          <h1>{event.name}</h1>
        </div>
        <div className="actions">
          <a className="secondaryButton" href="/events">Events</a>
        </div>
      </header>
      <EventWorkspaceNav active="form" eventId={event.id} />

      <section className="section editorLayout">
        <article className="panel">
          <div className="panelHeading">
            <h2>Registration Questions</h2>
            <span className="statusPill">{event.questions.length} total</span>
          </div>

          <div className="builderList">
            {event.questions.length === 0 ? (
              <div className="emptyState">
                <strong>No questions yet</strong>
                <span>Add the first question to begin shaping the registration flow.</span>
              </div>
            ) : event.questions.map((question) => {
              const saveQuestion = updateQuestion.bind(null, event.id, question.id);
              const removeQuestion = deleteQuestion.bind(null, event.id, question.id);

              return (
                <details className="builderItem" key={question.id}>
                  <summary>
                    <span>
                      <strong>{question.label}</strong>
                      <small>{formatStatus(question.questionType)} | {formatStatus(question.scope)} | {question.isRequired ? "Required" : "Optional"}</small>
                    </span>
                    <em>{question.options.length} options</em>
                  </summary>
                  <QuestionForm action={saveQuestion} question={question} submitLabel="Save Question" />
                  <form action={removeQuestion} className="deleteForm">
                    <button className="textButton dangerText" type="submit">Delete Question</button>
                  </form>
                </details>
              );
            })}
          </div>
        </article>

        <aside className="panel sidePanel">
          <h2>Add Question</h2>
          <QuestionForm action={addQuestion} submitLabel="Add Question" />
        </aside>
      </section>
    </main>
  );
}
