import { Combobox, Skeleton, cn } from '@mastra/playground-ui';
import type { ComboboxProps, ComboboxOption } from '@mastra/playground-ui';
import { Info } from 'lucide-react';
import type { MouseEvent } from 'react';
import { useMemo } from 'react';
import { useFilteredProviders } from '../hooks/use-filtered-providers';
import { useLLMProviders } from '../hooks/use-llm-providers';
import { cleanProviderId, findProviderById } from '../utils';
import { ProviderLogo } from './provider-logo';
import { useBuilderFilteredProviders, useBuilderModelPolicy } from '@/domains/agent-builder';

export interface LLMProvidersProps {
  value: string;
  onValueChange: (value: string) => void;
  allowedProviderIds?: string[];
  variant?: ComboboxProps['variant'];
  size?: ComboboxProps['size'];
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  container?: HTMLElement | ShadowRoot | null | React.RefObject<HTMLElement | ShadowRoot | null>;
  disabled?: boolean;
}

export const LLMProviders = ({
  value,
  onValueChange,
  allowedProviderIds,
  variant = 'default',
  size = 'default',
  className,
  open,
  onOpenChange,
  container,
  disabled,
}: LLMProvidersProps) => {
  const { data: dataProviders, isLoading: providersLoading } = useLLMProviders();
  const allProviders = dataProviders?.providers || [];
  const allowedProviderIdSet = useMemo(
    () => (allowedProviderIds ? new Set(allowedProviderIds.map(cleanProviderId)) : null),
    [allowedProviderIds],
  );

  // Apply admin model policy first (drops disallowed providers entirely),
  // then sort: connected -> popular -> alphabetical
  const policy = useBuilderModelPolicy();
  const policyProviders = useBuilderFilteredProviders(allProviders, policy);
  const providers = useMemo(
    () =>
      allowedProviderIdSet
        ? policyProviders.filter(provider => allowedProviderIdSet.has(cleanProviderId(provider.id)))
        : policyProviders,
    [allowedProviderIdSet, policyProviders],
  );
  const sortedProviders = useFilteredProviders(providers, '', false);

  const matchedProvider = findProviderById(providers, value);
  const currentModelProvider = matchedProvider?.id || cleanProviderId(value);

  // Create provider options with icons
  const providerOptions: ComboboxOption[] = useMemo(() => {
    const options = sortedProviders.map(provider => ({
      label: provider.name,
      value: provider.id,
      start: (
        <div className="relative shrink-0">
          <ProviderLogo providerId={provider.id} size={16} />
          <div
            className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
              provider.connected ? 'bg-accent1' : 'bg-accent2'
            }`}
            title={provider.connected ? 'Connected' : 'Not connected'}
          />
        </div>
      ),
      end: provider.docUrl ? (
        <Info
          className={cn(
            'size-3.5 text-neutral2 opacity-0 transition-opacity duration-100 cursor-pointer',
            'hover:text-neutral4 hover:opacity-100',
            'group-data-[highlighted]/item:opacity-100',
          )}
          onClick={(e: MouseEvent<SVGSVGElement>) => {
            e.stopPropagation();
            window.open(provider.docUrl, '_blank', 'noopener,noreferrer');
          }}
        />
      ) : null,
    }));
    if (currentModelProvider && !options.some(option => option.value === currentModelProvider)) {
      options.unshift({
        label: currentModelProvider,
        value: currentModelProvider,
        start: <ProviderLogo providerId={currentModelProvider} size={16} />,
        end: null,
      });
    }
    return options;
  }, [currentModelProvider, sortedProviders]);

  const handleValueChange = (providerId: string) => {
    const cleanedId = cleanProviderId(providerId);
    onValueChange(cleanedId);
  };

  if (providersLoading) {
    return <Skeleton className="w-full h-8" />;
  }

  return (
    <Combobox
      options={providerOptions}
      value={currentModelProvider}
      onValueChange={handleValueChange}
      placeholder="Select provider..."
      searchPlaceholder="Search providers..."
      emptyText="No providers found"
      variant={variant}
      size={size}
      className={className}
      open={open}
      onOpenChange={onOpenChange}
      container={container}
      disabled={disabled}
    />
  );
};
