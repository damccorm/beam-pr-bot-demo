// Licensed to the Apache Software Foundation (ASF) under one or more
// contributor license agreements.  See the NOTICE file distributed with
// this work for additional information regarding copyright ownership.
// The ASF licenses this file to You under the Apache License, Version 2.0
// (the "License"); you may not use this file except in compliance with
// the License.  You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Code generated by starcgen. DO NOT EDIT.
// File: coderx.shims.go

package coderx

import (
	"reflect"

	// Library imports
	"github.com/apache/beam/sdks/v2/go/pkg/beam/core/runtime"
	"github.com/apache/beam/sdks/v2/go/pkg/beam/core/runtime/graphx/schema"
	"github.com/apache/beam/sdks/v2/go/pkg/beam/core/typex"
	"github.com/apache/beam/sdks/v2/go/pkg/beam/core/util/reflectx"
)

func init() {
	runtime.RegisterFunction(decFloat)
	runtime.RegisterFunction(decInt32)
	runtime.RegisterFunction(decInt64)
	runtime.RegisterFunction(decString)
	runtime.RegisterFunction(decUint32)
	runtime.RegisterFunction(decUint64)
	runtime.RegisterFunction(decVarIntZ)
	runtime.RegisterFunction(decVarUintZ)
	runtime.RegisterFunction(encFloat)
	runtime.RegisterFunction(encInt32)
	runtime.RegisterFunction(encInt64)
	runtime.RegisterFunction(encString)
	runtime.RegisterFunction(encUint32)
	runtime.RegisterFunction(encUint64)
	runtime.RegisterFunction(encVarIntZ)
	runtime.RegisterFunction(encVarUintZ)
	runtime.RegisterType(reflect.TypeOf((*reflect.Type)(nil)).Elem())
	schema.RegisterType(reflect.TypeOf((*reflect.Type)(nil)).Elem())
	reflectx.RegisterFunc(reflect.TypeOf((*func(int32) []byte)(nil)).Elem(), funcMakerInt32ГSliceOfByte)
	reflectx.RegisterFunc(reflect.TypeOf((*func(int64) []byte)(nil)).Elem(), funcMakerInt64ГSliceOfByte)
	reflectx.RegisterFunc(reflect.TypeOf((*func(reflect.Type, []byte) (typex.T, error))(nil)).Elem(), funcMakerReflect۰TypeSliceOfByteГTypex۰TError)
	reflectx.RegisterFunc(reflect.TypeOf((*func([]byte) int32)(nil)).Elem(), funcMakerSliceOfByteГInt32)
	reflectx.RegisterFunc(reflect.TypeOf((*func([]byte) int64)(nil)).Elem(), funcMakerSliceOfByteГInt64)
	reflectx.RegisterFunc(reflect.TypeOf((*func([]byte) typex.T)(nil)).Elem(), funcMakerSliceOfByteГTypex۰T)
	reflectx.RegisterFunc(reflect.TypeOf((*func([]byte) uint32)(nil)).Elem(), funcMakerSliceOfByteГUint32)
	reflectx.RegisterFunc(reflect.TypeOf((*func([]byte) uint64)(nil)).Elem(), funcMakerSliceOfByteГUint64)
	reflectx.RegisterFunc(reflect.TypeOf((*func(typex.T) []byte)(nil)).Elem(), funcMakerTypex۰TГSliceOfByte)
	reflectx.RegisterFunc(reflect.TypeOf((*func(uint32) []byte)(nil)).Elem(), funcMakerUint32ГSliceOfByte)
	reflectx.RegisterFunc(reflect.TypeOf((*func(uint64) []byte)(nil)).Elem(), funcMakerUint64ГSliceOfByte)
}

type callerInt32ГSliceOfByte struct {
	fn func(int32) []byte
}

func funcMakerInt32ГSliceOfByte(fn interface{}) reflectx.Func {
	f := fn.(func(int32) []byte)
	return &callerInt32ГSliceOfByte{fn: f}
}

func (c *callerInt32ГSliceOfByte) Name() string {
	return reflectx.FunctionName(c.fn)
}

func (c *callerInt32ГSliceOfByte) Type() reflect.Type {
	return reflect.TypeOf(c.fn)
}

func (c *callerInt32ГSliceOfByte) Call(args []interface{}) []interface{} {
	out0 := c.fn(args[0].(int32))
	return []interface{}{out0}
}

func (c *callerInt32ГSliceOfByte) Call1x1(arg0 interface{}) interface{} {
	return c.fn(arg0.(int32))
}

type callerInt64ГSliceOfByte struct {
	fn func(int64) []byte
}

func funcMakerInt64ГSliceOfByte(fn interface{}) reflectx.Func {
	f := fn.(func(int64) []byte)
	return &callerInt64ГSliceOfByte{fn: f}
}

func (c *callerInt64ГSliceOfByte) Name() string {
	return reflectx.FunctionName(c.fn)
}

func (c *callerInt64ГSliceOfByte) Type() reflect.Type {
	return reflect.TypeOf(c.fn)
}

func (c *callerInt64ГSliceOfByte) Call(args []interface{}) []interface{} {
	out0 := c.fn(args[0].(int64))
	return []interface{}{out0}
}

func (c *callerInt64ГSliceOfByte) Call1x1(arg0 interface{}) interface{} {
	return c.fn(arg0.(int64))
}

type callerReflect۰TypeSliceOfByteГTypex۰TError struct {
	fn func(reflect.Type, []byte) (typex.T, error)
}

func funcMakerReflect۰TypeSliceOfByteГTypex۰TError(fn interface{}) reflectx.Func {
	f := fn.(func(reflect.Type, []byte) (typex.T, error))
	return &callerReflect۰TypeSliceOfByteГTypex۰TError{fn: f}
}

func (c *callerReflect۰TypeSliceOfByteГTypex۰TError) Name() string {
	return reflectx.FunctionName(c.fn)
}

func (c *callerReflect۰TypeSliceOfByteГTypex۰TError) Type() reflect.Type {
	return reflect.TypeOf(c.fn)
}

func (c *callerReflect۰TypeSliceOfByteГTypex۰TError) Call(args []interface{}) []interface{} {
	out0, out1 := c.fn(args[0].(reflect.Type), args[1].([]byte))
	return []interface{}{out0, out1}
}

func (c *callerReflect۰TypeSliceOfByteГTypex۰TError) Call2x2(arg0, arg1 interface{}) (interface{}, interface{}) {
	return c.fn(arg0.(reflect.Type), arg1.([]byte))
}

type callerSliceOfByteГInt32 struct {
	fn func([]byte) int32
}

func funcMakerSliceOfByteГInt32(fn interface{}) reflectx.Func {
	f := fn.(func([]byte) int32)
	return &callerSliceOfByteГInt32{fn: f}
}

func (c *callerSliceOfByteГInt32) Name() string {
	return reflectx.FunctionName(c.fn)
}

func (c *callerSliceOfByteГInt32) Type() reflect.Type {
	return reflect.TypeOf(c.fn)
}

func (c *callerSliceOfByteГInt32) Call(args []interface{}) []interface{} {
	out0 := c.fn(args[0].([]byte))
	return []interface{}{out0}
}

func (c *callerSliceOfByteГInt32) Call1x1(arg0 interface{}) interface{} {
	return c.fn(arg0.([]byte))
}

type callerSliceOfByteГInt64 struct {
	fn func([]byte) int64
}

func funcMakerSliceOfByteГInt64(fn interface{}) reflectx.Func {
	f := fn.(func([]byte) int64)
	return &callerSliceOfByteГInt64{fn: f}
}

func (c *callerSliceOfByteГInt64) Name() string {
	return reflectx.FunctionName(c.fn)
}

func (c *callerSliceOfByteГInt64) Type() reflect.Type {
	return reflect.TypeOf(c.fn)
}

func (c *callerSliceOfByteГInt64) Call(args []interface{}) []interface{} {
	out0 := c.fn(args[0].([]byte))
	return []interface{}{out0}
}

func (c *callerSliceOfByteГInt64) Call1x1(arg0 interface{}) interface{} {
	return c.fn(arg0.([]byte))
}

type callerSliceOfByteГTypex۰T struct {
	fn func([]byte) typex.T
}

func funcMakerSliceOfByteГTypex۰T(fn interface{}) reflectx.Func {
	f := fn.(func([]byte) typex.T)
	return &callerSliceOfByteГTypex۰T{fn: f}
}

func (c *callerSliceOfByteГTypex۰T) Name() string {
	return reflectx.FunctionName(c.fn)
}

func (c *callerSliceOfByteГTypex۰T) Type() reflect.Type {
	return reflect.TypeOf(c.fn)
}

func (c *callerSliceOfByteГTypex۰T) Call(args []interface{}) []interface{} {
	out0 := c.fn(args[0].([]byte))
	return []interface{}{out0}
}

func (c *callerSliceOfByteГTypex۰T) Call1x1(arg0 interface{}) interface{} {
	return c.fn(arg0.([]byte))
}

type callerSliceOfByteГUint32 struct {
	fn func([]byte) uint32
}

func funcMakerSliceOfByteГUint32(fn interface{}) reflectx.Func {
	f := fn.(func([]byte) uint32)
	return &callerSliceOfByteГUint32{fn: f}
}

func (c *callerSliceOfByteГUint32) Name() string {
	return reflectx.FunctionName(c.fn)
}

func (c *callerSliceOfByteГUint32) Type() reflect.Type {
	return reflect.TypeOf(c.fn)
}

func (c *callerSliceOfByteГUint32) Call(args []interface{}) []interface{} {
	out0 := c.fn(args[0].([]byte))
	return []interface{}{out0}
}

func (c *callerSliceOfByteГUint32) Call1x1(arg0 interface{}) interface{} {
	return c.fn(arg0.([]byte))
}

type callerSliceOfByteГUint64 struct {
	fn func([]byte) uint64
}

func funcMakerSliceOfByteГUint64(fn interface{}) reflectx.Func {
	f := fn.(func([]byte) uint64)
	return &callerSliceOfByteГUint64{fn: f}
}

func (c *callerSliceOfByteГUint64) Name() string {
	return reflectx.FunctionName(c.fn)
}

func (c *callerSliceOfByteГUint64) Type() reflect.Type {
	return reflect.TypeOf(c.fn)
}

func (c *callerSliceOfByteГUint64) Call(args []interface{}) []interface{} {
	out0 := c.fn(args[0].([]byte))
	return []interface{}{out0}
}

func (c *callerSliceOfByteГUint64) Call1x1(arg0 interface{}) interface{} {
	return c.fn(arg0.([]byte))
}

type callerTypex۰TГSliceOfByte struct {
	fn func(typex.T) []byte
}

func funcMakerTypex۰TГSliceOfByte(fn interface{}) reflectx.Func {
	f := fn.(func(typex.T) []byte)
	return &callerTypex۰TГSliceOfByte{fn: f}
}

func (c *callerTypex۰TГSliceOfByte) Name() string {
	return reflectx.FunctionName(c.fn)
}

func (c *callerTypex۰TГSliceOfByte) Type() reflect.Type {
	return reflect.TypeOf(c.fn)
}

func (c *callerTypex۰TГSliceOfByte) Call(args []interface{}) []interface{} {
	out0 := c.fn(args[0].(typex.T))
	return []interface{}{out0}
}

func (c *callerTypex۰TГSliceOfByte) Call1x1(arg0 interface{}) interface{} {
	return c.fn(arg0.(typex.T))
}

type callerUint32ГSliceOfByte struct {
	fn func(uint32) []byte
}

func funcMakerUint32ГSliceOfByte(fn interface{}) reflectx.Func {
	f := fn.(func(uint32) []byte)
	return &callerUint32ГSliceOfByte{fn: f}
}

func (c *callerUint32ГSliceOfByte) Name() string {
	return reflectx.FunctionName(c.fn)
}

func (c *callerUint32ГSliceOfByte) Type() reflect.Type {
	return reflect.TypeOf(c.fn)
}

func (c *callerUint32ГSliceOfByte) Call(args []interface{}) []interface{} {
	out0 := c.fn(args[0].(uint32))
	return []interface{}{out0}
}

func (c *callerUint32ГSliceOfByte) Call1x1(arg0 interface{}) interface{} {
	return c.fn(arg0.(uint32))
}

type callerUint64ГSliceOfByte struct {
	fn func(uint64) []byte
}

func funcMakerUint64ГSliceOfByte(fn interface{}) reflectx.Func {
	f := fn.(func(uint64) []byte)
	return &callerUint64ГSliceOfByte{fn: f}
}

func (c *callerUint64ГSliceOfByte) Name() string {
	return reflectx.FunctionName(c.fn)
}

func (c *callerUint64ГSliceOfByte) Type() reflect.Type {
	return reflect.TypeOf(c.fn)
}

func (c *callerUint64ГSliceOfByte) Call(args []interface{}) []interface{} {
	out0 := c.fn(args[0].(uint64))
	return []interface{}{out0}
}

func (c *callerUint64ГSliceOfByte) Call1x1(arg0 interface{}) interface{} {
	return c.fn(arg0.(uint64))
}

// DO NOT MODIFY: GENERATED CODE
