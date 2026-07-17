/**
 * Category-specific attribute definitions for the posting form.
 *
 * Keyed by the TOP-LEVEL category slug (not the subcategory) — every
 * subcategory under "Electronics" shares the same attribute set, for
 * example. This keeps the config small while still giving each listing
 * type the precise fields your supervisor asked for, without forcing
 * every listing through the same generic form.
 *
 * Each field definition:
 *   { key, label, type: "text" | "select", placeholder?, options? }
 *
 * Values are stored in `listings.attributes` (jsonb) as { [key]: value }.
 * Empty/blank values are stripped before submit — see buildAttributesPayload().
 */

export const PRODUCT_ATTRIBUTES = {
  electronics: [
    { key: "brand", label: "Brand", type: "text", placeholder: "e.g. Samsung, HP, Apple" },
    {
      key: "warranty",
      label: "Warranty status",
      type: "select",
      options: ["No warranty", "Under warranty", "Warranty expired"],
    },
  ],
  clothing: [
    {
      key: "size",
      label: "Size",
      type: "select",
      options: ["XS", "S", "M", "L", "XL", "XXL", "One size"],
    },
    { key: "gender", label: "For", type: "select", options: ["Men", "Women", "Unisex"] },
  ],
  "home-living": [
    { key: "material", label: "Material", type: "text", placeholder: "e.g. Wood, Plastic, Metal" },
  ],
  "books-study": [
    { key: "course_code", label: "Course code", type: "text", placeholder: "e.g. INF 410" },
    { key: "edition", label: "Edition / Year", type: "text", placeholder: "e.g. 3rd Edition, 2024" },
  ],
  "beauty-personal": [
    { key: "brand", label: "Brand", type: "text", placeholder: "e.g. Nivea, The Ordinary" },
  ],
  "food-snacks": [
    {
      key: "dietary_notes",
      label: "Dietary notes",
      type: "text",
      placeholder: "e.g. No nuts, Halal, Vegetarian",
    },
  ],
  "sports-fitness": [
    { key: "brand", label: "Brand", type: "text", placeholder: "e.g. Nike, Adidas" },
  ],
  accessories: [
    { key: "material", label: "Material", type: "text", placeholder: "e.g. Leather, Gold-plated" },
  ],
  stationery: [{ key: "brand", label: "Brand", type: "text" }],
  "other-products": [],
};

export const SERVICE_ATTRIBUTES = {
  tutoring: [
    { key: "subject", label: "Subject / Course", type: "text", placeholder: "e.g. Calculus, INF 410" },
    { key: "mode", label: "Mode", type: "select", options: ["In-person", "Online", "Both"] },
  ],
  photography: [
    { key: "turnaround_time", label: "Turnaround time", type: "text", placeholder: "e.g. 2-3 days" },
  ],
  "tech-services": [
    { key: "device_type", label: "Device type", type: "select", options: ["Phone", "Laptop", "Both"] },
  ],
  delivery: [
    {
      key: "coverage_area",
      label: "Coverage area",
      type: "text",
      placeholder: "e.g. Around campus, Cape Coast town",
    },
  ],
  laundry: [
    { key: "turnaround_time", label: "Turnaround time", type: "text", placeholder: "e.g. Same day, 24 hours" },
  ],
  "hair-grooming": [
    {
      key: "location",
      label: "Service location",
      type: "select",
      options: ["My place", "Client's place", "Both"],
    },
  ],
  "event-services": [
    {
      key: "event_type",
      label: "Event type",
      type: "text",
      placeholder: "e.g. Birthday, Graduation, Wedding",
    },
  ],
  "writing-editing": [
    { key: "turnaround_time", label: "Turnaround time", type: "text", placeholder: "e.g. 24 hours" },
  ],
  "graphic-design": [
    { key: "turnaround_time", label: "Turnaround time", type: "text", placeholder: "e.g. 2 days" },
    {
      key: "revisions_included",
      label: "Revisions included",
      type: "text",
      placeholder: "e.g. 2 free revisions",
    },
  ],
  "other-services": [],
};

/** Returns the attribute field definitions for a given top-level category slug + listing type. */
export function getAttributeFields(listingType, parentSlug) {
  if (!parentSlug) return [];
  const table = listingType === "service" ? SERVICE_ATTRIBUTES : PRODUCT_ATTRIBUTES;
  return table[parentSlug] || [];
}

/** Strips blank values so we don't store { brand: "" } in the jsonb column. */
export function buildAttributesPayload(fields, attributeValues) {
  const out = {};
  for (const f of fields) {
    const v = attributeValues[f.key];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      out[f.key] = v;
    }
  }
  return out;
}
