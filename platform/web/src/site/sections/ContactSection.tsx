import { Section } from "./shared";
import { Icon } from "./Icon";

interface ContactProps {
  heading: string;
  body: string;
  phone: string;
  email: string;
  address: string;
  map_url: string;
  form_enabled: boolean;
}

export function ContactSection({ props }: { props: ContactProps }) {
  const { heading, body, phone, email, address, map_url, form_enabled } = props;
  return (
    <Section id="contact">
      <div className="band rv">
        <div className="eb" style={{ justifyContent: "center", color: "var(--leaf-300)" }}>
          Start here
        </div>
        <h2 style={{ maxWidth: 640, margin: "0 auto" }}>{heading}</h2>
        {body && (
          <p className="lead" style={{ margin: "18px auto 0", color: "rgba(255,255,255,.76)" }}>
            {body}
          </p>
        )}
        <div style={{ display: "flex", gap: 26, justifyContent: "center", flexWrap: "wrap", marginTop: 30, fontSize: "12.5px", color: "rgba(255,255,255,.6)" }}>
          {email && (
            <span>
              <Icon name="envelope" /> {email}
            </span>
          )}
          {phone && (
            <span>
              <Icon name="phone" /> {phone}
            </span>
          )}
          {address && (
            <span>
              <Icon name="location-dot" /> {address}
            </span>
          )}
        </div>
        {form_enabled && map_url && (
          <div style={{ marginTop: 24 }}>
            <iframe
              src={map_url}
              title="Map"
              style={{ width: "100%", height: 300, border: 0, borderRadius: 14 }}
              loading="lazy"
            />
          </div>
        )}
      </div>
    </Section>
  );
}
