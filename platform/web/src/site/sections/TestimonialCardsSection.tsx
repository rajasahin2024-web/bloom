import { Head, Section } from "./shared";
import { Icon } from "./Icon";

interface TestimonialCardsProps {
  eyebrow?: string;
  heading: string;
  lead?: string;
  students: {
    name: string;
    photo_url: string;
    before_band: number;
    after_band: number;
    quote: string;
    course: string;
  }[];
}

export function TestimonialCardsSection({ props }: { props: TestimonialCardsProps }) {
  const { eyebrow = "Our students", heading, lead, students } = props;
  return (
    <Section id="students">
      <Head eyebrow={eyebrow} heading={heading} lead={lead} />
      <div className="grid g3">
        {students.map((s, i) => {
          const ini = s.name
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("");
          return (
            <div key={i} className="tcard rv in">
              <div className="q">“{s.quote}”</div>
              <div className="who">
                <div className="tav">{ini}</div>
                <div>
                  <div className="nm">{s.name}</div>
                  <div className="mt">{s.course}</div>
                </div>
                <div className="jump">
                  <span className="a">{Number(s.before_band).toFixed(1)}</span>
                  <Icon name="arrow-right" size={12} />
                  <span className="b">{Number(s.after_band).toFixed(1)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
