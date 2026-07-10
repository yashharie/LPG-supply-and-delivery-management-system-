import { useEffect, useRef } from "react";
import DataTableLib from "datatables.net-dt";
import "datatables.net-dt/css/dataTables.dataTables.css";

/**
 * Reusable DataTable wrapper.
 *
 * Props:
 *   id        – unique table id (required to avoid conflicts)
 *   columns   – array of { title, data?, render? } — standard DT column defs
 *   data      – array of row objects
 *   options   – extra DataTables options (optional)
 */
const DataTable = ({ id, columns, data, options = {} }) => {
  const tableRef = useRef(null);
  const dtRef    = useRef(null);

  useEffect(() => {
    if (!tableRef.current || !data) return;

    // Destroy previous instance if data changed
    if (dtRef.current) {
      dtRef.current.destroy();
      dtRef.current = null;
    }

    dtRef.current = new DataTableLib(tableRef.current, {
      data,
      columns,
      pageLength:    10,
      lengthMenu:    [5, 10, 25, 50, 100],
      responsive:    true,
      autoWidth:     false,
      language: {
        search:         "🔍 Search:",
        lengthMenu:     "Show _MENU_ entries",
        info:           "Showing _START_ to _END_ of _TOTAL_ entries",
        infoEmpty:      "No entries found",
        infoFiltered:   "(filtered from _MAX_ total)",
        zeroRecords:    "No matching records found",
        paginate: {
          first:    "«",
          last:     "»",
          next:     "›",
          previous: "‹",
        },
      },
      ...options,
    });

    return () => {
      if (dtRef.current) {
        dtRef.current.destroy();
        dtRef.current = null;
      }
    };
  }, [data]);

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        id={id}
        ref={tableRef}
        className="display stripe hover"
        style={{ width: "100%" }}
      />
    </div>
  );
};

export default DataTable;
