package com.netflix.contentservice.config;

import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Sends read-only transactions to the reader pool and everything else to the writer pool.
 * Both pools talk to ProxySQL: the writer account lands on the MySQL primary, the reader account is
 * load-balanced over the replicas (see docker/proxysql/proxysql.cnf).
 */
public class ReadWriteRoutingDataSource extends AbstractRoutingDataSource {

    public enum Route {WRITER, READER}

    @Override
    protected Object determineCurrentLookupKey() {
        return TransactionSynchronizationManager.isCurrentTransactionReadOnly() ? Route.READER : Route.WRITER;
    }
}
