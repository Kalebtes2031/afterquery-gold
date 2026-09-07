import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./ui/button";

describe("Button", () => {
  it("renders correctly", () => {
    render(<Button>Save</Button>);

    expect(screen.getByText("Save")).toBeInTheDocument();
  });
});