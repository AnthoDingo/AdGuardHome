import React, { ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';

import { CLIENT_ID_LINK } from '../../../../helpers/constants';
import { removeEmptyLines, trimMultilineString } from '../../../../helpers/helpers';
import { Textarea } from '../../../ui/Controls/Textarea';
import CountrySelector from './CountrySelector';

type FormData = {
    allowed_clients: string;
    disallowed_clients: string;
    blocked_hosts: string;
    blocked_countries: string[];
    countries_mode: 'block' | 'allow';
};

type FormProps = {
    initialValues?: {
        allowed_clients?: string;
        disallowed_clients?: string;
        blocked_hosts?: string;
        blocked_countries?: string[];
        countries_mode?: string;
    };
    onSubmit: (data: FormData) => void;
    processingSet: boolean;
};

const Form = ({ initialValues, onSubmit, processingSet }: FormProps) => {
    const { t } = useTranslation();

    const {
        control,
        handleSubmit,
        watch,
        formState: { isSubmitting },
    } = useForm<FormData>({
        mode: 'onBlur',
        defaultValues: {
            allowed_clients: initialValues?.allowed_clients || '',
            disallowed_clients: initialValues?.disallowed_clients || '',
            blocked_hosts: initialValues?.blocked_hosts || '',
            blocked_countries: initialValues?.blocked_countries || [],
            countries_mode: (initialValues?.countries_mode as 'block' | 'allow') || 'block',
        },
    });

    const allowedClients = watch('allowed_clients');
    const countriesMode = watch('countries_mode');
    const blockedCountries = watch('blocked_countries');

    const fields: {
        id: keyof Omit<FormData, 'blocked_countries' | 'countries_mode'>;
        title: string;
        subtitle: ReactNode;
        normalizeOnBlur: (value: string) => string;
    }[] = [
        {
            id: 'allowed_clients',
            title: t('access_allowed_title'),
            subtitle: (
                <Trans
                    components={{
                        a: <a href={CLIENT_ID_LINK} target="_blank" rel="noopener noreferrer" />,
                    }}>
                    access_allowed_desc
                </Trans>
            ),
            normalizeOnBlur: removeEmptyLines,
        },
        {
            id: 'disallowed_clients',
            title: t('access_disallowed_title'),
            subtitle: (
                <Trans
                    components={{
                        a: <a href={CLIENT_ID_LINK} target="_blank" rel="noopener noreferrer" />,
                    }}>
                    access_disallowed_desc
                </Trans>
            ),
            normalizeOnBlur: trimMultilineString,
        },
        {
            id: 'blocked_hosts',
            title: t('access_blocked_title'),
            subtitle: t('access_blocked_desc'),
            normalizeOnBlur: removeEmptyLines,
        },
    ];

    const renderField = ({
        id,
        title,
        subtitle,
        normalizeOnBlur,
    }: {
        id: keyof Omit<FormData, 'blocked_countries' | 'countries_mode'>;
        title: string;
        subtitle: ReactNode;
        normalizeOnBlur: (value: string) => string;
    }) => {
        const disabled = allowedClients && id === 'disallowed_clients';

        return (
            <div key={id} className="form__group mb-5">
                <label className="form__label form__label--with-desc" htmlFor={id}>
                    {title}
                    {disabled && <>&nbsp;({t('disabled')})</>}
                </label>

                <div className="form__desc form__desc--top">{subtitle}</div>

                <Controller
                    name={id}
                    control={control}
                    render={({ field }) => (
                        <Textarea
                            {...field}
                            id={id}
                            data-testid={id}
                            disabled={disabled || processingSet}
                            onBlur={(e) => {
                                field.onChange(normalizeOnBlur(e.target.value));
                            }}
                        />
                    )}
                />
            </div>
        );
    };

    // Dynamic label and description based on current mode
    const sectionTitle =
        countriesMode === 'allow'
            ? t('access_countries_allowlist_title')
            : t('access_blocked_countries_title');

    const sectionDesc =
        countriesMode === 'allow'
            ? t('access_countries_allowlist_desc')
            : t('access_blocked_countries_desc');

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            {fields.map((f) => renderField(f))}

            {/* Country access control section */}
            <div className="form__group mb-5">
                <div className="d-flex align-items-center justify-content-between mb-1">
                    <label className="form__label form__label--with-desc mb-0">
                        {sectionTitle}
                        {blockedCountries.length > 0 && (
                            <span className="badge badge-secondary ml-2">
                                {blockedCountries.length}
                            </span>
                        )}
                    </label>

                    {/* Block / Allow toggle */}
                    <Controller
                        name="countries_mode"
                        control={control}
                        render={({ field }) => (
                            <div
                                className="btn-group btn-group-sm"
                                role="group"
                                aria-label={t('countries_mode_label')}>
                                <button
                                    type="button"
                                    className={`btn ${
                                        field.value === 'block'
                                            ? 'btn-danger'
                                            : 'btn-outline-danger'
                                    }`}
                                    disabled={processingSet}
                                    onClick={() => field.onChange('block')}>
                                    {t('countries_mode_block')}
                                </button>
                                <button
                                    type="button"
                                    className={`btn ${
                                        field.value === 'allow'
                                            ? 'btn-success'
                                            : 'btn-outline-success'
                                    }`}
                                    disabled={processingSet}
                                    onClick={() => field.onChange('allow')}>
                                    {t('countries_mode_allow')}
                                </button>
                            </div>
                        )}
                    />
                </div>

                <div className="form__desc form__desc--top">{sectionDesc}</div>

                <Controller
                    name="blocked_countries"
                    control={control}
                    render={({ field }) => (
                        <CountrySelector
                            value={field.value}
                            onChange={field.onChange}
                            disabled={processingSet}
                        />
                    )}
                />
            </div>

            <div className="card-actions">
                <div className="btn-list">
                    <button
                        type="submit"
                        data-testid="access_save"
                        className="btn btn-success btn-standard"
                        disabled={isSubmitting || processingSet}>
                        {t('save_config')}
                    </button>
                </div>
            </div>
        </form>
    );
};

export default Form;
