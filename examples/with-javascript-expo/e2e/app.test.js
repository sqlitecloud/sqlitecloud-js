describe('mobile todo app test', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it.only('should have welcome screen', async () => {
    await expect(element(by.text(/organize your/i))).toBeVisible();
    await expect(element(by.text(/tasks with sqlite/i))).toBeVisible();
    await expect(element(by.text(/designed for happiness, not just productivity./i))).toBeVisible();
    await expect(element(by.text(/enjoy a stress-free way to manage your day./i))).toBeVisible();

  });

  it('should show hello screen after tap', async () => {
    await element(by.id('hello_button')).tap();
    await expect(element(by.text('Hello!!!'))).toBeVisible();
  });

  it('should show world screen after tap', async () => {
    await element(by.id('world_button')).tap();
    await expect(element(by.text('World!!!'))).toBeVisible();
  });
});
