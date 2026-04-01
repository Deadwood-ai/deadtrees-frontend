import { useState, useEffect } from "react";
import { useData } from "../hooks/useDataProvider";

interface AuthorOption {
  label: string;
  value: string;
}

export const useAuthorOptions = () => {
  const [options, setOptions] = useState<AuthorOption[]>([]);
  const { authors } = useData();

  useEffect(() => {
    if (authors) {
      const authorsUnique = Array.from(new Map(authors.map((author) => [author.value, author])).values());
      setOptions(authorsUnique);
    }
  }, [authors]);

  return options;
};
