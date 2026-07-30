interface Rectangle {
  height: number;
  width: number;
  x: number;
  y: number;
}

export function centerDebugWindowInWorkArea(
  workArea: Rectangle,
  preferredSize = { width: 485, height: 780 },
): Rectangle {
  const width = Math.min(preferredSize.width, workArea.width);
  const height = Math.min(preferredSize.height, workArea.height);
  return {
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + (workArea.height - height) / 2),
    width,
    height,
  };
}

export function placeDebugWindowBesideApp(
  workArea: Rectangle,
  appBounds: Rectangle,
  preferredSize = { width: 485, height: 780 },
): Rectangle {
  const width = Math.min(preferredSize.width, workArea.width);
  const height = Math.min(preferredSize.height, workArea.height);
  const workAreaRight = workArea.x + workArea.width;
  const appRight = appBounds.x + appBounds.width;
  const spaceRight = workAreaRight - appRight;
  const spaceLeft = appBounds.x - workArea.x;
  const x = spaceRight >= width
    ? appRight
    : spaceLeft >= width
      ? appBounds.x - width
      : Math.min(Math.max(appRight, workArea.x), workAreaRight - width);
  return {
    x,
    y: Math.min(Math.max(appBounds.y, workArea.y), workArea.y + workArea.height - height),
    width,
    height,
  };
}
