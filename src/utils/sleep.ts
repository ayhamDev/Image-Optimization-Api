export const Sleep = (duration: number): Promise<boolean> =>
  new Promise((res) => {
    setTimeout(() => {
      res(true);
    }, duration);
  });
