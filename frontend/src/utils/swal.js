import Swal from "sweetalert2";

/** Confirm dialog — returns true if user clicks Confirm */
export const confirmDialog = async ({
  title   = "Are you sure?",
  text    = "",
  icon    = "warning",
  confirmText = "Yes, proceed",
  cancelText  = "Cancel",
  danger  = false,
} = {}) => {
  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton:  true,
    confirmButtonText: confirmText,
    cancelButtonText:  cancelText,
    confirmButtonColor: danger ? "#dc2626" : "#1e62d4",
    cancelButtonColor:  "#6b7280",
    borderRadius: "12px",
    customClass: { popup: "swal-popup" },
  });
  return result.isConfirmed;
};

/** Success toast (top-right, auto-close 2.5s) */
export const toast = (title, icon = "success") =>
  Swal.fire({
    toast:            true,
    position:         "top-end",
    icon,
    title,
    showConfirmButton: false,
    timer:            2500,
    timerProgressBar: true,
  });

/** Full-screen success */
export const successAlert = (title, text = "") =>
  Swal.fire({ title, text, icon: "success", confirmButtonColor: "#1e62d4" });

/** Full-screen error */
export const errorAlert = (title, text = "") =>
  Swal.fire({ title, text, icon: "error", confirmButtonColor: "#dc2626" });
