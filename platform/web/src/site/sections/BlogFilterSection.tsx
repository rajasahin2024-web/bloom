import { useState } from "react";
import { BLOG_FILTER_EVENT } from "./BlogGridSection";

interface BlogFilterProps {
  categories: { name: string; count: string }[];
}

/* The prototype renders the pills inline above #blogGrid inside the same
   .sec — this section is therefore the bare `.pills` row (no .sec wrapper),
   and it shares state with BlogGridSection via the bloom:blog-filter event. */
export function BlogFilterSection({ props }: { props: BlogFilterProps }) {
  const categories = props.categories ?? [];
  const total = categories.reduce((n, c) => n + (Number(c.count) || 0), 0);
  const [active, setActive] = useState("All");

  const pick = (name: string) => {
    setActive(name);
    window.dispatchEvent(
      new CustomEvent(BLOG_FILTER_EVENT, { detail: { category: name } }),
    );
  };

  return (
    <div className="pills rv" style={{ marginBottom: 26 }}>
      <button className={`pill${active === "All" ? " on" : ""}`} onClick={() => pick("All")}>
        All <span className="n">{total}</span>
      </button>
      {categories.map((c, i) => (
        <button
          key={i}
          className={`pill${active === c.name ? " on" : ""}`}
          onClick={() => pick(c.name)}
        >
          {c.name} <span className="n">{c.count}</span>
        </button>
      ))}
    </div>
  );
}
