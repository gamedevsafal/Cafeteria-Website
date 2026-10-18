import { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";
import { formatDateTime, timeAgo, Spinner, Empty, Alert, Confirm } from "../ui.jsx";

export default function Enquiries() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("false");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [notes, setNotes] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminEnquiries(filter === "all" ? {} : { handled: filter });
      setItems(res.enquiries);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(item, body) {
    try {
      const updated = await api.updateEnquiry(item.id, body);
      setItems((l) => l.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Enquiries</h1>
          <p className="sub">Messages from the contact form.</p>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      {err && <Alert>{err}</Alert>}

      <div className="toolbar">
        {[
          ["false", "New"],
          ["true", "Handled"],
          ["all", "All"]
        ].map(([v, label]) => (
          <button key={v} className={"chip" + (filter === v ? " on" : "")} onClick={() => setFilter(v)}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="card">
          <Empty title="Nothing here">Messages from the website contact form land on this page.</Empty>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>From</th>
                  <th>Topic</th>
                  <th>Message</th>
                  <th>When</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <tr key={e.id} style={{ opacity: e.handled ? 0.6 : 1 }}>
                    <td>
                      <strong>{e.name}</strong>
                      <br />
                      {e.phone && (
                        <a className="small" href={`tel:${e.phone}`}>
                          {e.phone}
                        </a>
                      )}
                      {e.email && (
                        <>
                          <br />
                          <a className="small" href={`mailto:${e.email}`}>
                            {e.email}
                          </a>
                        </>
                      )}
                      {e.people && <div className="small muted">{e.people} guests</div>}
                    </td>
                    <td>
                      <span className="pill">{e.topic}</span>
                    </td>
                    <td style={{ maxWidth: 380 }}>
                      <div style={{ whiteSpace: "pre-wrap" }}>{e.message}</div>
                      <input
                        type="text"
                        placeholder="Add an internal note"
                        value={notes[e.id] ?? e.note ?? ""}
                        onChange={(ev) => setNotes((n) => ({ ...n, [e.id]: ev.target.value }))}
                        onBlur={() => patch(e, { note: notes[e.id] ?? "" })}
                        style={{ marginTop: 8, fontSize: ".8rem", padding: "5px 8px" }}
                      />
                    </td>
                    <td className="nowrap small" title={formatDateTime(e.createdAt)}>
                      {timeAgo(e.createdAt)}
                    </td>
                    <td className="right nowrap">
                      <button className="btn btn-ghost btn-sm" onClick={() => patch(e, { handled: !e.handled })}>
                        {e.handled ? "Reopen" : "Mark handled"}
                      </button>{" "}
                      <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(e)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Confirm
        open={!!confirmDelete}
        title="Delete this enquiry?"
        message="The message will be removed permanently."
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          try {
            await api.deleteEnquiry(confirmDelete.id);
            setItems((l) => l.filter((i) => i.id !== confirmDelete.id));
          } catch (e) {
            setErr(e.message);
          }
          setConfirmDelete(null);
        }}
      />
    </>
  );
}
