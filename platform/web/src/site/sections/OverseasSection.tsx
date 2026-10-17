import { Head, Section } from "./shared";
import { Icon } from "./Icon";

interface OverseasProps {
  heading: string;
  body: string;
  items: { title: string; body: string }[];
}

export function OverseasSection({ props }: { props: OverseasProps }) {
  const { heading, body, items } = props;
  return (
    <Section variant="dark" id="overseas">
      <Head eyebrow="Study abroad" heading={heading} lead={body} />
      <div className="path rv">
        {items.map((it, i) => (
          <div key={i} className="pstep">
            <div className="n">{i + 1}</div>
            <h3>{it.title}</h3>
            <p>{it.body}</p>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: 44 }} className="rv">
        <a className="btn btn-white btn-lg" href="#contact">
          <Icon name="plane-departure" /> Talk to an overseas counsellor
        </a>
      </div>
    </Section>
  );
}
