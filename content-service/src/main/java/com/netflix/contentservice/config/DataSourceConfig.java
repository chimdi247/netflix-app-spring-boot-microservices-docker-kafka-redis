package com.netflix.contentservice.config;

import com.netflix.contentservice.config.ReadWriteRoutingDataSource.Route;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.datasource.LazyConnectionDataSourceProxy;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.Map;

/**
 * Two connection pools (writer / reader) behind one routing DataSource.
 *
 *   @Transactional(readOnly = true)  -> reader pool -> ProxySQL hostgroup 20 (MySQL replicas)
 *   everything else                  -> writer pool -> ProxySQL hostgroup 10 (MySQL primary)
 *
 * LazyConnectionDataSourceProxy delays taking a physical connection until the first SQL statement, which is
 * after Spring has marked the transaction read-only, so the routing decision sees the right flag.
 */
@Configuration
public class DataSourceConfig {

    @Bean
    @ConfigurationProperties("app.datasource.writer")
    public HikariDataSource writerDataSource() {
        return new HikariDataSource();
    }

    @Bean
    @ConfigurationProperties("app.datasource.reader")
    public HikariDataSource readerDataSource() {
        return new HikariDataSource();
    }

    @Bean
    public DataSource routingDataSource(@Qualifier("writerDataSource") DataSource writer,
                                        @Qualifier("readerDataSource") DataSource reader) {
        ReadWriteRoutingDataSource routing = new ReadWriteRoutingDataSource();
        Map<Object, Object> targets = new HashMap<>();
        targets.put(Route.WRITER, writer);
        targets.put(Route.READER, reader);
        routing.setTargetDataSources(targets);
        routing.setDefaultTargetDataSource(writer);
        return routing;
    }

    @Bean
    @Primary
    public DataSource dataSource(@Qualifier("routingDataSource") DataSource routing) {
        return new LazyConnectionDataSourceProxy(routing);
    }
}
