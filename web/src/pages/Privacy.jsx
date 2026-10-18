export default function Privacy() {
  return (
    <section className="section">
      <div className="container narrow">
        <nav className="crumbs" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span>/</span>
          <span aria-current="page">Privacy</span>
        </nav>
        <p className="eyebrow">Placeholder</p>
        <h1>Privacy policy</h1>

        <div className="alert alert-warn">
          This page is a placeholder. Replace it with a real privacy policy before the site
          goes live, in the language your customers expect.
        </div>

        <p>
          <strong>What we collect.</strong> When you place an order or send an enquiry we
          keep your name, mobile number, and anything else you type into the form. We use
          it to fulfil your order and to reply to you.
        </p>
        <p>
          <strong>What we do not do.</strong> We do not sell or share your details with
          anyone else. There is no advertising tracker on this site.
        </p>
        <p>
          <strong>How long we keep it.</strong> Order records are kept for tax purposes.
          Enquiries that never became orders are deleted after twelve months.
        </p>
        <p>
          <strong>Asking us to delete it.</strong> Message us and we will remove your
          details from anything that is not a tax record.
        </p>
        <p className="card-text small">
          Written by a human, not a lawyer. Get it checked before you rely on it.
        </p>
      </div>
    </section>
  );
}
