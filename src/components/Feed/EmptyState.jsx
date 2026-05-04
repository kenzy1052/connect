import { Link } from "react-router-dom";

export function EmptyState({
  icon = "📭",
  title,
  description,
  buttonText,
  buttonTo,
  onButtonClick,
}) {
  const isReactElement = typeof icon === "object" && icon !== null;
  return (
    <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
      <div
        className={`mb-5 drop-shadow-sm ${isReactElement ? "text-slate-400" : "text-5xl"}`}
      >
        {icon}
      </div>
      <h3 className="text-white font-black text-xl mb-2">{title}</h3>
      <p className="text-slate-500 text-sm mb-8 max-w-sm mx-auto">
        {description}
      </p>

      {buttonTo ? (
        <Link
          to={buttonTo}
          className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-3 rounded-xl transition-all active:scale-95"
        >
          {buttonText}
        </Link>
      ) : onButtonClick ? (
        <button
          onClick={onButtonClick}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-3 rounded-xl transition-all active:scale-95"
        >
          {buttonText}
        </button>
      ) : null}
    </div>
  );
}
