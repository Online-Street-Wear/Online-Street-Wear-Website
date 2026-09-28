export const FREE_SHIPPING_THRESHOLD = 2000;

export const SHIPPING_BY_PROVINCE = {
  gauteng: 80,
  western_cape: 100,
  kwazulu_natal: 110,
  eastern_cape: 120,
  free_state: 130,
  mpumalanga: 130,
  north_west: 125,
  limpopo: 140,
  northern_cape: 150,
} as const;

export type ShippingProvince = keyof typeof SHIPPING_BY_PROVINCE;

export const SHIPPING_PROVINCE_OPTIONS: { value: ShippingProvince; label: string }[] = [
  { value: "gauteng", label: "Gauteng" },
  { value: "western_cape", label: "Western Cape" },
  { value: "kwazulu_natal", label: "KwaZulu-Natal" },
  { value: "eastern_cape", label: "Eastern Cape" },
  { value: "free_state", label: "Free State" },
  { value: "mpumalanga", label: "Mpumalanga" },
  { value: "north_west", label: "North West" },
  { value: "limpopo", label: "Limpopo" },
  { value: "northern_cape", label: "Northern Cape" },
];

export const getShippingFee = (subtotal: number, province: ShippingProvince) => {
  if (subtotal > FREE_SHIPPING_THRESHOLD) {
    return 0;
  }

  return SHIPPING_BY_PROVINCE[province];
};
