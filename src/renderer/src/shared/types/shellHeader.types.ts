export interface ShellHeaderFilterConfig {
  id: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}

export interface ShellHeaderSearchConfig {
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}

export interface ShellHeaderPrimaryAction {
  label: string;
  onClick: () => void;
}

export interface ShellHeaderConfig {
  description?: string;
  filters?: ShellHeaderFilterConfig[] | null;
  primaryAction?: ShellHeaderPrimaryAction | null;
  search?: ShellHeaderSearchConfig | null;
  title: string;
}

export const emptyShellHeaderConfig: ShellHeaderConfig = {
  title: "",
};
