import { Button } from "@/shared/ui/button";

interface PropertySubmitButtonProps {
  isSubmitting: boolean;
}

export function PropertySubmitButton({
  isSubmitting,
}: PropertySubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={isSubmitting}
      className="
        min-w-36
        w-full
        sm:w-auto
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:shadow-lg
        active:translate-y-0
      "
    >
      {isSubmitting ? "در حال ثبت..." : "ثبت ملک"}
    </Button>
  );
}