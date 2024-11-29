import { test, expect } from '@playwright/test'

test('has title', async ({ page }) => {
  await page.goto('http://localhost:5173/')
  await expect(page).toHaveTitle(/Vite \+ React/)
})

test('get chinook albums', async ({ page }) => {
  await page.goto('http://localhost:5173/')
  await expect(page.getByRole('heading', { name: 'Albums' })).toBeVisible()

  await expect(page.getByText('For Those About To Rock We Salute You by AC/DC')).toBeVisible()
  await expect(page.getByText('Balls to the Wall by Accept')).toBeVisible()
  await expect(page.getByText('Restless and Wild by Accept')).toBeVisible()
  await expect(page.getByText('Let There Be Rock by AC/DC')).toBeVisible()
  await expect(page.getByText('Big Ones by Aerosmith')).toBeVisible()
  await expect(page.getByText('Jagged Little Pill by Alanis Morissette')).toBeVisible()
  await expect(page.getByText('Facelift by Alice In Chains')).toBeVisible()
  await expect(page.getByText('Warner 25 Anos by Antônio Carlos Jobim')).toBeVisible()
  await expect(page.getByText('Plays Metallica By Four Cellos by Apocalyptica')).toBeVisible()
  await expect(page.getByText('Audioslave by Audioslave')).toBeVisible()
  await expect(page.getByText('Out Of Exile by Audioslave')).toBeVisible()
  await expect(page.getByText('BackBeat Soundtrack by BackBeat')).toBeVisible()
  await expect(page.getByText('The Best Of Billy Cobham by Billy Cobham')).toBeVisible()
  await expect(page.getByText('Alcohol Fueled Brewtality Live! [Disc 1] by Black Label Society')).toBeVisible()
  await expect(page.getByText('Alcohol Fueled Brewtality Live! [Disc 2] by Black Label Society')).toBeVisible()
  await expect(page.getByText('Black Sabbath by Black Sabbath')).toBeVisible()
  await expect(page.getByText('Black Sabbath Vol. 4 (Remaster) by Black Sabbath')).toBeVisible()
  await expect(page.getByText('Body Count by Body Count')).toBeVisible()
  await expect(page.getByText('Chemical Wedding by Bruce Dickinson')).toBeVisible()
  await expect(page.getByText('The Best Of Buddy Guy - The Millenium Collection by Buddy Guy')).toBeVisible()
})
