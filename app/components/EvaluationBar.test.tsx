import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EvaluationBar } from "@/app/components/EvaluationBar";
import type { Score } from "@/lib/stockfish";

describe("EvaluationBar", () => {
  it("renders without crashing when score is null", () => {
    const { container } = render(<EvaluationBar score={null} />);
    expect(container.querySelector(".eval-bar")).toBeInTheDocument();
  });

  it("shows equal label when score is null", () => {
    render(<EvaluationBar score={null} />);
    expect(screen.getByText("0.0")).toBeInTheDocument();
  });

  it("shows centipawn advantage for white", () => {
    const score: Score = { type: "cp", value: 150 };
    render(<EvaluationBar score={score} />);
    expect(screen.getByText("1.5")).toBeInTheDocument();
  });

  it("shows centipawn advantage for black", () => {
    const score: Score = { type: "cp", value: -200 };
    render(<EvaluationBar score={score} />);
    expect(screen.getByText("2.0")).toBeInTheDocument();
  });

  it("shows mate notation for white", () => {
    const score: Score = { type: "mate", value: 3 };
    render(<EvaluationBar score={score} />);
    expect(screen.getByText("M3")).toBeInTheDocument();
  });

  it("shows mate notation for black", () => {
    const score: Score = { type: "mate", value: -5 };
    render(<EvaluationBar score={score} />);
    expect(screen.getByText("M5")).toBeInTheDocument();
  });

  it("shows checkmate symbol for large mate values", () => {
    const score: Score = { type: "mate", value: 1000 };
    render(<EvaluationBar score={score} />);
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("shows = for exactly 0 centipawns", () => {
    const score: Score = { type: "cp", value: 0 };
    render(<EvaluationBar score={score} />);
    expect(screen.getByText("=")).toBeInTheDocument();
  });

  it("applies flipped transform when flipped prop is true", () => {
    const { container } = render(
      <EvaluationBar score={{ type: "cp", value: 0 }} flipped />,
    );
    const bar = container.querySelector(".eval-bar") as HTMLElement;
    expect(bar.style.transform).toBe("scaleY(-1)");
  });

  it("does not apply flipped transform when flipped prop is false", () => {
    const { container } = render(
      <EvaluationBar score={{ type: "cp", value: 0 }} flipped={false} />,
    );
    const bar = container.querySelector(".eval-bar") as HTMLElement;
    expect(bar.style.transform).toBe("none");
  });
});
