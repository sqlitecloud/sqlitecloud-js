describe('React Native project connection test', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it.only('should show chinook query result', async () => {
    await expect(element(by.text('Albums'))).toBeVisible();

    await waitFor(element(by.text('• For Those About To Rock We Salute You by AC/DC'))).toBeVisible().withTimeout(10000)
    await waitFor(element(by.text('• Balls to the Wall by Accept'))).toBeVisible().withTimeout(10000)
    await waitFor(element(by.text('• Restless and Wild by Accept'))).toBeVisible().withTimeout(10000)
    await waitFor(element(by.text('• Let There Be Rock by AC/DC'))).toBeVisible().withTimeout(10000)
    await waitFor(element(by.text('• Big Ones by Aerosmith'))).toBeVisible().withTimeout(10000)
    await waitFor(element(by.text('• Jagged Little Pill by Alanis Morissette'))).toBeVisible().withTimeout(10000)
    await waitFor(element(by.text('• Facelift by Alice In Chains'))).toBeVisible().withTimeout(10000)
    await waitFor(element(by.text('• Warner 25 Anos by Antônio Carlos Jobim'))).toBeVisible().withTimeout(10000)
    await waitFor(element(by.text('• Plays Metallica By Four Cellos by Apocalyptica'))).toBeVisible().withTimeout(10000)
    await waitFor(element(by.text('• Audioslave by Audioslave'))).toBeVisible().withTimeout(10000)
    await waitFor(element(by.text('• Out Of Exile by Audioslave'))).toBeVisible().withTimeout(10000)
    await waitFor(element(by.text('• BackBeat Soundtrack by BackBeat'))).toBeVisible().withTimeout(10000)
    await waitFor(element(by.text('• The Best Of Billy Cobham by Billy Cobham'))).toBeVisible().withTimeout(10000)
    await waitFor(element(by.text('• Alcohol Fueled Brewtality Live! [Disc 1] by Black Label Society'))).toBeVisible().withTimeout(10000)
    await waitFor(element(by.text('• Alcohol Fueled Brewtality Live! [Disc 2] by Black Label Society'))).toBeVisible().withTimeout(10000)
    await waitFor(element(by.text('• Black Sabbath by Black Sabbath'))).toBeVisible().withTimeout(10000)
    await waitFor(element(by.text('• Black Sabbath Vol. 4 (Remaster) by Black Sabbath'))).toBeVisible().withTimeout(10000)
  });
});
