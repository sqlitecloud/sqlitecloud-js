describe('React Native project connection test', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it.only('should show chinook query result', async () => {
    await expect(element(by.text('Albums'))).toBeVisible();

    await expect(element(by.text('• For Those About To Rock We Salute You by AC/DC'))).toBeVisible()
    await expect(element(by.text('• Balls to the Wall by Accept'))).toBeVisible()
    await expect(element(by.text('• Restless and Wild by Accept'))).toBeVisible()
    await expect(element(by.text('• Let There Be Rock by AC/DC'))).toBeVisible()
    await expect(element(by.text('• Big Ones by Aerosmith'))).toBeVisible()
    await expect(element(by.text('• Jagged Little Pill by Alanis Morissette'))).toBeVisible()
    await expect(element(by.text('• Facelift by Alice In Chains'))).toBeVisible()
    await expect(element(by.text('• Warner 25 Anos by Antônio Carlos Jobim'))).toBeVisible()
    await expect(element(by.text('• Plays Metallica By Four Cellos by Apocalyptica'))).toBeVisible()
    await expect(element(by.text('• Audioslave by Audioslave'))).toBeVisible()
    await expect(element(by.text('• Out Of Exile by Audioslave'))).toBeVisible()
    await expect(element(by.text('• BackBeat Soundtrack by BackBeat'))).toBeVisible()
    await expect(element(by.text('• The Best Of Billy Cobham by Billy Cobham'))).toBeVisible()
    await expect(element(by.text('• Alcohol Fueled Brewtality Live! [Disc 1] by Black Label Society'))).toBeVisible()
    await expect(element(by.text('• Alcohol Fueled Brewtality Live! [Disc 2] by Black Label Society'))).toBeVisible()
    await expect(element(by.text('• Black Sabbath by Black Sabbath'))).toBeVisible()
    await expect(element(by.text('• Black Sabbath Vol. 4 (Remaster) by Black Sabbath'))).toBeVisible()
    await expect(element(by.text('• Body Count by Body Count'))).toBeVisible()
    await expect(element(by.text('• Chemical Wedding by Bruce Dickinson'))).toBeVisible()
    await expect(element(by.text('• The Best Of Buddy Guy - The Millenium Collection by Buddy Guy'))).toBeVisible()
  });
});
