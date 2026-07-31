import { atom } from "nanostores";

const initial =
    typeof localStorage !== "undefined"
        ? Number(localStorage.getItem("points") ?? 0)
        : 0;

export const points = atom(initial);

export function setPoints(value: number) {
    points.set(value);
    localStorage.setItem("points", value.toString());
}

export function addPoints(amount: number) {
    setPoints(points.get() + amount);
}

export function getPoints() {
    return points.get();
}
