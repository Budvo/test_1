import { useEffect, useMemo, useState } from "react";

// ===== Типы =====

export type AnswerOption = {
  id: string; // любой уникальный идентификатор варианта
  text: string; // текст варианта ответа
  isCorrect: boolean; // отмечаем только ПРАВИЛЬНЫЙ вариант (true), остальные false
};

export type Question = {
  id: number; // уникальный номер вопроса
  text: string; // текст вопроса
  options: AnswerOption[]; // варианты ответов (от 2 и больше)
};

// ===== Место, где вы будете хранить ВСЕ вопросы =====
// Сюда вы вручную заносите свои 120–150 вопросов.
// Примеры ниже — просто образец структуры. Замените на свои данные.

const ALL_QUESTIONS: Question[] = [
  {
    id: 1,
    text: "Что не относится к опасным факторам пожара, воздействующим на людей и имущество:",
    options: [
      { id: "1a", text: "Пламя и искры", isCorrect: false },
      { id: "1b", text: "Повышенная температура окружающей среды", isCorrect: false },
      { id: "1c", text: "Вынос высокого напряжения на токопроводящие части технологических установок", isCorrect: true },
      { id: "1d", text: "Пониженная концентрация кислорода", isCorrect: false },
      { id: "1e", text: "Повышенная концентрация токсичных продуктов горения и термического разложения", isCorrect: false },
    ],
  },
  {
    id: 2,
    text: "Время работы в средствах защиты кожи определяется",
    options: [
      { id: "2a", text: "Физической нагрузкой и температурой окружающей среды", isCorrect: true },
      { id: "2b", text: "Временем выполнения задачи по ликвидации ЧС", isCorrect: false },
      { id: "2с", text: "Самочувствием спасателя и способностью продолжать работать", isCorrect: false },
    ],
  },
  {
    id: 3,
    text: "Что такое адаптация человека?",
    options: [
      { id: "3a", text: "Протекание психических процессов в зависимости от состояния и явлений действительности", isCorrect: false },
      { id: "3b", text: "Устойчивое психическое состояние человека в различных условиях", isCorrect: false },
      { id: "3c", text: "Процесс приспособления человека к условиям внешней среды", isCorrect: true },
    ],
  },
  {
    id: 4,
    text: "Какой максимально допустимый наклон насосной станции при работающем двигателе",
    options: [
      { id: "4a", text: "Не более 20 градусов", isCorrect: false },
      { id: "4b", text: "Не более 30 градусов", isCorrect: true },
      { id: "4c", text: "Не более 40 градусов", isCorrect: false },
    ],
  },
  // 👉 здесь продолжайте добавлять свои вопросы до 120–150 штук
  // { id: 4, text: "...", options: [...] },
  // { id: 5, text: "...", options: [...] },
];

// ===== Вспомогательные функции =====

function pickRandomQuestions(source: Question[], count: number): Question[] {
  // Перемешиваем копию массива и берём первые count элементов
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Тип расширяем window для Telegram WebApp API (чтобы не ругался TypeScript)
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        sendData: (data: string) => void;
      };
    };
  }
}

// ===== Основной компонент приложения =====

export function App() {
  const QUESTION_COUNT = 20; // сколько вопросов брать в тест
  const PASS_THRESHOLD = 16; // от скольки правильных — "зачёт"

  const [questions, setQuestions] = useState<Question[]>(() =>
    pickRandomQuestions(ALL_QUESTIONS, Math.min(QUESTION_COUNT, ALL_QUESTIONS.length))
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | null>>({});
  const [isFinished, setIsFinished] = useState(false);

  // Инициализация Telegram WebApp (если приложение открыто внутри Telegram)
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready();
        tg.expand();
      } catch {
        // игнорируем, если что-то пошло не так
      }
    }
  }, []);

  const currentQuestion = questions[currentIndex];

  const correctCount = useMemo(
    () =>
      questions.reduce((sum, q) => {
        const chosen = answers[q.id];
        const correctOption = q.options.find((o) => o.isCorrect);
        if (!correctOption) return sum;
        return sum + (chosen === correctOption.id ? 1 : 0);
      }, 0),
    [answers, questions]
  );

  const isPassed = correctCount >= PASS_THRESHOLD;

  const handleAnswer = (optionId: string) => {
    if (!currentQuestion) return;

    const questionId = currentQuestion.id;
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));

    const isLast = currentIndex === questions.length - 1;
    if (isLast) {
      setIsFinished(true);

      // Если находимся в Telegram, можем отправить результат боту
      const tg = window.Telegram?.WebApp;
      if (tg && typeof tg.sendData === "function") {
        const payload = {
          type: "quizResult",
          correct: correctCount + (isAnswerCorrect(currentQuestion, optionId) ? 1 : 0),
          total: questions.length,
          passed: correctCount + (isAnswerCorrect(currentQuestion, optionId) ? 1 : 0) >= PASS_THRESHOLD,
          answers,
        };
        tg.sendData(JSON.stringify(payload));
      }
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleRestart = () => {
    setQuestions(pickRandomQuestions(ALL_QUESTIONS, Math.min(QUESTION_COUNT, ALL_QUESTIONS.length)));
    setCurrentIndex(0);
    setAnswers({});
    setIsFinished(false);
  };

  if (!currentQuestion && !isFinished) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-50">
        <div className="text-center text-sm text-slate-300">
          Недостаточно вопросов в базе. Добавьте больше вопросов в ALL_QUESTIONS.
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex w-full max-w-xl flex-col px-4 pb-6 pt-8">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Тест для Telegram</h1>
            <p className="text-xs text-slate-400">
              20 случайных вопросов из вашей базы
            </p>
          </div>
          <button
            onClick={handleRestart}
            className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200 shadow-sm hover:bg-slate-700"
          >
            Перезапустить
          </button>
        </header>

        {!isFinished ? (
          <main className="flex flex-1 flex-col">
            <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
              <span>
                Вопрос {currentIndex + 1} / {questions.length}
              </span>
              <span>Правильных: {correctCount}</span>
            </div>

            {currentQuestion && (
              <>
                <div className="mb-4 rounded-2xl bg-slate-900/60 p-4 shadow-lg shadow-slate-950/40">
                  <p className="text-sm leading-relaxed whitespace-pre-line">{currentQuestion.text}</p>
                </div>

                <div className="mt-auto flex flex-col gap-2">
                  {currentQuestion.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleAnswer(option.id)}
                      className="w-full rounded-2xl bg-slate-800 px-4 py-3 text-left text-sm font-medium transition active:scale-[0.98] hover:bg-slate-700"
                    >
                      {option.text}
                    </button>
                  ))}
                </div>
              </>
            )}
          </main>
        ) : (
          <main className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="mb-6 rounded-3xl bg-slate-900/70 px-6 py-8 shadow-lg shadow-slate-950/40">
              <h2 className="mb-2 text-xl font-semibold">Тест завершён</h2>
              <p className="mb-4 text-sm text-slate-300">
                Правильных ответов: {correctCount} из {questions.length}
              </p>
              <p
                className={
                  "text-lg font-bold " +
                  (isPassed ? "text-emerald-400" : "text-rose-400")
                }
              >
                {isPassed ? "Зачёт" : "Незачёт"}
              </p>
            </div>

            <button
              onClick={handleRestart}
              className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400"
            >
              Пройти ещё раз
            </button>
          </main>
        )}

        <footer className="mt-4 text-center text-[10px] text-slate-500">
          Интерфейс адаптирован под Telegram WebApp: вопрос сверху, варианты ответов кнопками внизу.
        </footer>
      </div>
    </div>
  );
}

function isAnswerCorrect(question: Question, optionId: string): boolean {
  const option = question.options.find((o) => o.id === optionId);
  return Boolean(option && option.isCorrect);
}
