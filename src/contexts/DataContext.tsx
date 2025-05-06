import { createContext } from "react";
import { IDataset, IThumbnail, ICollaborators } from "../types/dataset";

interface AuthorOption {
  label: string;
  value: string;
}

export type DataContextType = {
  data: IDataset[] | undefined;
  filter: string;
  setFilter: (filter: string) => void;
  setFilterTag: (filterTag: string) => void;
  thumbnails: IThumbnail[] | undefined;
  collaborators: ICollaborators[] | undefined;
  authors: AuthorOption[] | undefined;
  userData: IDataset[] | undefined;
  isLoading: boolean;
};

export const DataContext = createContext<DataContextType>({
  data: undefined,
  filter: "",
  setFilter: () => {},
  setFilterTag: () => {},
  authors: undefined,
  thumbnails: undefined,
  collaborators: undefined,
  userData: undefined,
  isLoading: false,
});
