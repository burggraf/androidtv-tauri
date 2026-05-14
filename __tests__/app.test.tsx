import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppContent } from "../src/App";

describe("App navigation", () => {
  it("renders menu with 4 buttons on initial load", () => {
    render(<AppContent />);
    expect(screen.getByText("Android TV App")).toBeInTheDocument();
    expect(screen.getByText("Movies")).toBeInTheDocument();
    expect(screen.getByText("Series")).toBeInTheDocument();
    expect(screen.getByText("Live TV")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("navigates to Movies page when Movies button clicked", () => {
    render(<AppContent />);
    fireEvent.click(screen.getByText("Movies"));
    expect(screen.getByText("🎬 Movies")).toBeInTheDocument();
    expect(
      screen.getByText("Browse the latest movies and blockbusters.")
    ).toBeInTheDocument();
  });

  it("navigates to Series page when Series button clicked", () => {
    render(<AppContent />);
    fireEvent.click(screen.getByText("Series"));
    expect(screen.getByText("📺 TV Series")).toBeInTheDocument();
    expect(
      screen.getByText("Discover trending TV shows and series.")
    ).toBeInTheDocument();
  });

  it("navigates to Live TV page when Live TV button clicked", () => {
    render(<AppContent />);
    fireEvent.click(screen.getByText("Live TV"));
    expect(screen.getByText("📡 Live TV")).toBeInTheDocument();
    expect(
      screen.getByText("Watch live television channels.")
    ).toBeInTheDocument();
  });

  it("navigates to Settings page when Settings button clicked", () => {
    render(<AppContent />);
    fireEvent.click(screen.getByText("Settings"));
    expect(screen.getByText("⚙️ Settings")).toBeInTheDocument();
    expect(
      screen.getByText("Configure your app preferences.")
    ).toBeInTheDocument();
  });

  it("goes back to menu when back button clicked on a page", () => {
    render(<AppContent />);
    fireEvent.click(screen.getByText("Movies"));
    expect(screen.getByText("🎬 Movies")).toBeInTheDocument();
    fireEvent.click(screen.getByText("← Back to Menu"));
    expect(screen.getByText("Android TV App")).toBeInTheDocument();
    expect(screen.getByText("Movies")).toBeInTheDocument();
    expect(screen.getByText("Series")).toBeInTheDocument();
  });

  it("navigates to multiple pages and back correctly", () => {
    render(<AppContent />);
    fireEvent.click(screen.getByText("Settings"));
    expect(screen.getByText("⚙️ Settings")).toBeInTheDocument();
    fireEvent.click(screen.getByText("← Back to Menu"));
    expect(screen.getByText("Android TV App")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Live TV"));
    expect(screen.getByText("📡 Live TV")).toBeInTheDocument();
    fireEvent.click(screen.getByText("← Back to Menu"));
    expect(screen.getByText("Android TV App")).toBeInTheDocument();
  });
});

describe("D-pad keyboard navigation", () => {
  it("navigates buttons with ArrowRight and ArrowLeft", () => {
    render(<AppContent />);
    const buttons = screen.getAllByRole("button");
    expect(document.activeElement).toBe(buttons[0]);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(document.activeElement).toBe(buttons[1]);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(document.activeElement).toBe(buttons[2]);

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(buttons[1]);
  });

  it("activates focused button on Enter key", () => {
    render(<AppContent />);
    const buttons = screen.getAllByRole("button");
    expect(document.activeElement).toBe(buttons[0]);

    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByText("🎬 Movies")).toBeInTheDocument();
  });

  it("goes back on Escape key from a page", () => {
    render(<AppContent />);
    fireEvent.click(screen.getByText("Series"));
    expect(screen.getByText("📺 TV Series")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByText("Android TV App")).toBeInTheDocument();
  });

  it("ArrowLeft stays at first button, ArrowRight stays at last button", () => {
    render(<AppContent />);
    const buttons = screen.getAllByRole("button");

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(buttons[0]);

    // Move to last
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(document.activeElement).toBe(buttons[3]);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(document.activeElement).toBe(buttons[3]);
  });
});
