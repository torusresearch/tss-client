export const CLUSTER_REGIONS = [
    {
      key: "localhost",
      label: "localhost",
    },
    {
      key: "sg",
      label: "Singapore",
    },
    {
      key: "na",
      label: "North America",
    },
    {
      key: "sa",
      label: "South America",
    },
    {
      key: "eu",
      label: "Europe",
    },
  ];
  
  export const SERVER_OPTIONS = ["1", "2", "3", "4", "5"].map((i) => ({ label: parseInt(i, 10) + 1, key: i }));
  
  export enum LOGGER_TYPES {
    DKLS19 = "dkls19",
    GG20 = "gg20",
  }
  