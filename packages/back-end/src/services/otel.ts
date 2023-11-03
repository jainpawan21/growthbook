import { metrics } from "@opentelemetry/api";

const getMeter = (name: string) => {
  return metrics.getMeter(name);
};

const getUpDownCounter = (name: string) => {
  return getMeter(name).createUpDownCounter(name);
};

const getHistogram = (name: string) => {
  return getMeter(name).createHistogram(name);
};

export const trackJob = (
  jobName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (...args: any[]) => Promise<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => async (...args: any[]) => {
  const counter = getUpDownCounter(`jobs.${jobName}.count`);
  const histogram = getHistogram(`jobs.${jobName}.duration`);
  const startTime = new Date().getTime();
  try {
    counter.add(1);
    const res = await fn(...args);
    counter.add(-1);
    histogram.record(new Date().getTime() - startTime);
    return res;
  } catch (e) {
    counter.add(-1);
    histogram.record(new Date().getTime() - startTime);
  }
};
