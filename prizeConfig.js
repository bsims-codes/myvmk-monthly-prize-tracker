/* prizeConfig.js
   Maintainer-controlled monthly prize definitions.
   Add a new month key each time prizes roll over. Keep old months so users can browse old prize lists.
*/

window.PRIZE_CONFIG = {
  "November 2025": {
    keys: {
      bronze: [
        { id: "bronze_autumnal_thumper", name: "Autumnal Leaves - Thumper" },
        { id: "bronze_pumpkin_patch", name: "Pumpkin Patch" },
        { id: "bronze_seasonal_bush", name: "Seasonal Bush 3-in-1" }
      ],
      silver: [
        { id: "silver_autumnal_olaf", name: "Autumnal Leaves - Olaf" },
        { id: "silver_festive_fall_lamp", name: "Festive Fall Lamp" },
        { id: "silver_scarecrow", name: "Scarecrow" }
      ],
      gold: [
        { id: "gold_leaf_rug_cotw", name: "Leaf Rug - Colors of the Wind" },
        { id: "gold_autumnal_tinkerbell", name: "Autumnal Leaves - Tinkerbell" },
        { id: "gold_autumn_wings", name: "Autumn Wings" }
      ]
    },
    sits: {
      theme: "Hundred Acre Autumn",
      common: [
        { id: "sits_haa_eeyore", name: "Eeyore" },
        { id: "sits_haa_rabbit", name: "Rabbit" },
        { id: "sits_haa_roo", name: "Roo" },
        { id: "sits_haa_tigger", name: "Tigger" }
      ],
      rare: [
        { id: "sits_haa_piglet", name: "Piglet" }
      ],
      ultra: [
        { id: "sits_haa_pooh", name: "Pooh" }
      ],
      creditsEnabled: true
    }
  },
  "December 2025": {
    keys: {
      bronze: [
        { id: "bronze_giant_cone_choc", name: "Giant Ice Cream Cone - Chocolate" },
        { id: "bronze_giant_cone_straw", name: "Giant Ice Cream Cone - Strawberry" },
        { id: "bronze_holiday_pjs_stitch", name: "Holiday PJs - Stitch" }
      ],
      silver: [
        { id: "silver_stacked_cones", name: "Stacked Ice Cream Cones" },
        { id: "silver_holiday_pjs_angel", name: "Holiday PJs - Angel" },
        { id: "silver_snow_bank_seat", name: "Snow Bank Seat" }
      ],
      gold: [
        { id: "gold_ice_cream_truck", name: "Ice Cream Truck" },
        { id: "gold_skin_icey", name: "Skin - Icey" },
        { id: "gold_aura_snow_flurry", name: "Aura - Snow Flurry" }
      ]
    },
    sits: {
      theme: "Frozen Pixels",
      common: [
        { id: "sits_olaf", name: "Olaf" },
        { id: "sits_snowgies", name: "Snowgies" },
        { id: "sits_grand_pabbie_troll", name: "Grand Pabbie Troll" },
        { id: "sits_anna", name: "Anna" }
      ],
      rare: [
        { id: "sits_elsa", name: "Elsa" }
      ],
      ultra: [
        { id: "sits_sven", name: "Sven" }
      ],
      creditsEnabled: true
    }
  },
  "January 2026": {
    keys: {
      bronze: [
        { id: "bronze_disco_floor_freeze", name: "Disco Floor - Freeze" },
        { id: "bronze_ballroom_chandelier_silver", name: "Ballroom Chandelier - Silver" },
        { id: "bronze_ballroom_chandelier_ww", name: "Ballroom Chandelier - Winter Wonderland" }
      ],
      silver: [
        { id: "silver_symphony_sorcery_pin", name: "Symphony of Sorcery (Pin)" },
        { id: "silver_bed_fantasia", name: "Bed - Fantasia" },
        { id: "silver_column_ww", name: "Column - Winter Wonderland" }
      ],
      gold: [
        { id: "gold_winter_black_beanie", name: "Winter Black Beanie" },
        { id: "gold_winter_black_jacket", name: "Winter Black Jacket" },
        { id: "gold_baseball_cap_arctic_tundra", name: "Baseball Cap Reversed - Arctic Tundra Sparkle" }
      ]
    },
    sits: {
      theme: "Gingerbread Princess",
      common: [
        { id: "sits_gb_ariel", name: "Ariel" },
        { id: "sits_gb_belle", name: "Belle" },
        { id: "sits_gb_cinderella", name: "Cinderella" },
        { id: "sits_gb_snow_white", name: "Snow White" },
        { id: "sits_gb_tiana", name: "Tiana" }
      ],
      rare: [],
      ultra: [],
      creditsEnabled: true
    }
  }
};
