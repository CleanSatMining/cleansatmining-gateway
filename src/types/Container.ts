export type PowerCapacityHistory = {
  start: Date;
  end: Date;
  days: number;
  hashrateTHs: number;
  powerW: number;
  containers: ContainerCapacity[];
};

export type ContainerCapacity = {
  containerId: number;
  hashrateTHs: number;
  powerW: number;
  asics: {
    hashrateTHs: number;
    powerW: number;
    units: number;
    model: string;
    manufacturer: string;
  };
};
