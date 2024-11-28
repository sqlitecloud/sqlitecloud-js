//won't do insert and delete action in these tests since they will run in parallel in different devices

//cross-compatible go back function
export const pressBack = async () => {
  if (device.getPlatform() === 'android') {
    await device.pressBack();
  } else {
    await element(by.traits(['button']))
      .atIndex(0)
      .tap();
  }
};

describe('mobile todo app test', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show welcome screen', async () => {
    await waitFor(element(by.text(/cover/i))).toBeVisible().withTimeout(10000);

    await waitFor(element(by.text(/organize your/i))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text(/tasks with sqlite/i))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text(/designed for happiness, not just productivity./i))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text(/enjoy a stress-free way to manage your day./i))).toBeVisible().withTimeout(10000);

    await waitFor(element(by.text(/get started/i))).toBeVisible().withTimeout(10000);
  });

  it('should get categories from chinook', async () => {
    await waitFor(element(by.text(/get started/i))).toBeVisible().withTimeout(10000);
    await element(by.text(/get started/i)).tap();

    await waitFor(element(by.text(/inbox/i))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text(/work/i))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text(/personal/i))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text(/expo_ci_do_not_delete/i))).toBeVisible().withTimeout(10000);
  });

  it('should get tasks from chinook', async () => {
    await waitFor(element(by.text(/get started/i))).toBeVisible().withTimeout(10000);
    await element(by.text(/get started/i)).tap();

    await waitFor(element(by.text(/inbox/i))).toBeVisible().withTimeout(10000);
    await element(by.text(/inbox/i)).tap();
    await waitFor(element(by.text(/task_work/i))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text(/task_personal/i))).toBeVisible().withTimeout(10000);
    await pressBack();

    await waitFor(element(by.text(/work/i))).toBeVisible().withTimeout(10000);
    await element(by.text(/work/i)).tap();
    await waitFor(element(by.text(/task_work/i))).toBeVisible().withTimeout(10000);
    await pressBack();

    await waitFor(element(by.text(/personal/i))).toBeVisible().withTimeout(10000);
    await element(by.text(/personal/i)).tap();
    await waitFor(element(by.text(/task_personal/i))).toBeVisible().withTimeout(10000);
    await pressBack();

    await waitFor(element(by.text(/categories/i))).toBeVisible().withTimeout(10000);
  });
});
