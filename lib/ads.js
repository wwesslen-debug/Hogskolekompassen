export const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-7522543243781751";

const fallbackDisplaySlot = process.env.NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT || "";

export const adsenseSlots = {
  homeLeft: process.env.NEXT_PUBLIC_ADSENSE_HOME_LEFT_SLOT || fallbackDisplaySlot,
  homeRight: process.env.NEXT_PUBLIC_ADSENSE_HOME_RIGHT_SLOT || fallbackDisplaySlot,
  homeInline: process.env.NEXT_PUBLIC_ADSENSE_HOME_INLINE_SLOT || fallbackDisplaySlot,
  catalogInline: process.env.NEXT_PUBLIC_ADSENSE_CATALOG_INLINE_SLOT || fallbackDisplaySlot,
  programInline: process.env.NEXT_PUBLIC_ADSENSE_PROGRAM_INLINE_SLOT || fallbackDisplaySlot,
};

export function getAdSenseConfig(slotName) {
  return {
    client: adsenseClient,
    slot: adsenseSlots[slotName] || "",
  };
}
