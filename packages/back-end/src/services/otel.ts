import { metrics } from "@opentelemetry/api";

const getMeter = (name: string) => {
  return metrics.getMeter(name);
};

export const getUpDownCounter = (name: string) => {
  return getMeter(name).createUpDownCounter(name);
};
