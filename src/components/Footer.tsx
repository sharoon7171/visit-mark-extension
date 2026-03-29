import {
  footerCredit,
  footerCreditLink,
  footerRoot,
} from "../../ui-classes/footer";

const SQ_TECH_URL = "https://www.sqtech.dev/";

export function Footer() {
  return (
    <footer className={footerRoot}>
      <p className={footerCredit}>
        Developed by{" "}
        <a
          className={footerCreditLink}
          href={SQ_TECH_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          SQ Tech
        </a>
      </p>
    </footer>
  );
}
