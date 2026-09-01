export const dealCustomers = ["Sensiplast", "Sanitas", "Kaufland", "Hartmann", "Private Label"] as const;

export function isHartmannCustomer(value?: string | null) {
  return value?.trim().toLowerCase() === "hartmann";
}
