FROM golang:1.24-alpine AS build
WORKDIR /src
COPY go.mod main.go indicators.json ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /sinval .
FROM alpine:3.22
RUN apk add --no-cache ca-certificates
COPY --from=build /sinval /sinval
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["/sinval"]
