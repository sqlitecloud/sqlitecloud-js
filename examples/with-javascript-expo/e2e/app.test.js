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
    await expect(element(by.text(/cover/i))).toBeVisible();

    await expect(element(by.text(/organize your/i))).toBeVisible();
    await expect(element(by.text(/tasks with sqlite/i))).toBeVisible();
    await expect(element(by.text(/designed for happiness, not just productivity./i))).toBeVisible();
    await expect(element(by.text(/enjoy a stress-free way to manage your day./i))).toBeVisible();

    await expect(element(by.text(/get started/i))).toBeVisible();
  });

  it('should get categories from chinook', async () => {
    await expect(element(by.text(/get started/i))).toBeVisible();
    await element(by.text(/get started/i)).tap();

    await expect(element(by.text(/inbox/i))).toBeVisible();
    await expect(element(by.text(/work/i))).toBeVisible();
    await expect(element(by.text(/personal/i))).toBeVisible();
    await waitFor(element(by.text(/expo_ci_do_not_delete/i))).toBeVisible().withTimeout(10000);
  });

  it('should get tasks from chinook', async () => {
    await expect(element(by.text(/get started/i))).toBeVisible();
    await element(by.text(/get started/i)).tap();

    await expect(element(by.text(/inbox/i))).toBeVisible();
    await element(by.text(/inbox/i)).tap();
    await waitFor(element(by.text(/task_work/i))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.text(/task_personal/i))).toBeVisible().withTimeout(10000);
    await pressBack();

    await expect(element(by.text(/work/i))).toBeVisible();
    await element(by.text(/work/i)).tap();
    await waitFor(element(by.text(/task_work/i))).toBeVisible().withTimeout(10000);
    await pressBack();

    await expect(element(by.text(/personal/i))).toBeVisible();
    await element(by.text(/personal/i)).tap();
    await waitFor(element(by.text(/task_personal/i))).toBeVisible().withTimeout(10000);
    await pressBack();

    await expect(element(by.text(/categories/i))).toBeVisible();
  });
});
